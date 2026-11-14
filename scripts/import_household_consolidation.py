#!/usr/bin/env python3
"""Preview and explicitly import one reviewed consolidation workbook."""

from __future__ import annotations

import argparse
import getpass
import os
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any
from uuid import UUID

import psycopg
from openpyxl import load_workbook
from psycopg import sql


HOUSEHOLD_REQUIRED_COLUMNS = {
    "household_code",
    "head_name",
    "head_age",
    "head_sex",
    "barangay",
    "purok",
    "vulnerabilities",
    "review_status",
}
MEMBER_REQUIRED_COLUMNS = {
    "household_code",
    "member_sequence",
    "full_name",
    "age",
    "age_value",
    "age_unit",
    "sex",
    "is_household_head",
    "review_status",
}
PROFILE_COLUMNS = {
    "monthly_income": "monthly_income",
    "gov_assistance_availed": "gov_assistance_availed",
    "characteristics_remarks": "characteristics_remarks",
    "has_worked_dole": "has_worked_dole",
    "dole_employment_year": "dole_employment_year",
    "has_received_government_assistance": "has_received_government_assistance",
    "government_assistance_year": "government_assistance_year",
    "has_received_relief_assistance": "has_received_relief_assistance",
    "other_income_source": "other_income_source",
    "flood_depth_level": "flood_depth_level",
}
HOUSEHOLD_OPTIONAL_COLUMNS = {
    "head_occupation",
    "center_id",
    "designated_center_id",
    "room_id",
    "stub_code",
    "stub_issued",
    "stub_issued_at",
    "stub_issued_by",
    "evacuee_status",
}
MEMBER_OPTIONAL_COLUMNS = {"relationship_to_head", "occupation"}
SOURCE_COLUMNS = {"source_file", "source_sheet", "source_row", "review_status", "review_notes"}
HOUSEHOLD_ALLOWED_COLUMNS = HOUSEHOLD_REQUIRED_COLUMNS | HOUSEHOLD_OPTIONAL_COLUMNS | SOURCE_COLUMNS
MEMBER_ALLOWED_COLUMNS = MEMBER_REQUIRED_COLUMNS | MEMBER_OPTIONAL_COLUMNS | {
    "vulnerabilities",
} | SOURCE_COLUMNS
PROFILE_ALLOWED_COLUMNS = set(PROFILE_COLUMNS) | SOURCE_COLUMNS | {
    "household_code",
    "member_sequence",
}
SOURCE_MAP_ALLOWED_COLUMNS = {
    "source_file",
    "source_sheet",
    "source_column_header",
    "canonical_sheet",
    "canonical_column",
    "mapping_rule_or_question",
    "decision_status",
    "review_notes",
}
REVIEW_STATUSES = {"PENDING", "REVIEWED", "NEEDS CLARIFICATION"}
SEX_VALUES = {"MALE", "FEMALE"}
BOOLEAN_FIELDS = {
    "stub_issued",
    "is_household_head",
    "has_worked_dole",
    "has_received_government_assistance",
    "has_received_relief_assistance",
}


class ImportValidationError(Exception):
    """Raised when the workbook cannot be imported without guessing."""


@dataclass
class ImportBatch:
    households: list[dict[str, Any]]
    members: list[dict[str, Any]]
    household_profiles: list[dict[str, Any]]
    member_profiles: list[dict[str, Any]]
    mapping_rows: list[dict[str, Any]]
    warnings: list[str]


def is_blank(value: Any) -> bool:
    return value is None or (isinstance(value, str) and not value.strip())


def clean_text(value: Any) -> str:
    return str(value).strip() if value is not None else ""


def read_sheet(workbook: Any, name: str, required: bool = True) -> list[dict[str, Any]]:
    if name not in workbook.sheetnames:
        if required:
            raise ImportValidationError(f"Required worksheet is missing: {name}")
        return []

    worksheet = workbook[name]
    header_cells = next(worksheet.iter_rows(min_row=1, max_row=1), ())
    headers = [clean_text(cell.value).lower() for cell in header_cells]
    while headers and not headers[-1]:
        headers.pop()
    if not headers or any(not header for header in headers):
        raise ImportValidationError(f"{name}: row 1 must contain non-empty column headers.")
    if len(set(headers)) != len(headers):
        raise ImportValidationError(f"{name}: duplicate column headers were found.")

    rows: list[dict[str, Any]] = []
    for row_number, cells in enumerate(
        worksheet.iter_rows(min_row=2, max_col=len(headers)),
        start=2,
    ):
        if any(cell.data_type == "f" for cell in cells):
            raise ImportValidationError(
                f"{name} row {row_number}: formulas are not allowed in import data."
            )
        values = [cell.value for cell in cells]
        if all(is_blank(value) for value in values):
            continue
        rows.append(
            {
                **{header: value for header, value in zip(headers, values)},
                "__row_number": row_number,
            }
        )
    return rows


def reject_unmapped_columns(
    rows: list[dict[str, Any]], allowed: set[str], sheet_name: str
) -> None:
    for row in rows:
        unmapped = [
            column
            for column, value in row.items()
            if column != "__row_number" and column not in allowed and not is_blank(value)
        ]
        if unmapped:
            raise ImportValidationError(
                f"{sheet_name} row {row['__row_number']}: non-empty unrecognized "
                f"column(s): {', '.join(sorted(unmapped))}. Map these fields before importing."
            )


def require_columns(
    rows: list[dict[str, Any]], required: set[str], sheet_name: str, headers: set[str]
) -> None:
    missing = required - headers
    if missing:
        raise ImportValidationError(
            f"{sheet_name}: missing required columns: {', '.join(sorted(missing))}"
        )


def required_text(value: Any, field: str, sheet: str, row_number: int) -> str:
    result = clean_text(value)
    if not result:
        raise ImportValidationError(f"{sheet} row {row_number}: {field} is required.")
    return result


def parse_integer(value: Any, field: str, sheet: str, row_number: int) -> int:
    if isinstance(value, bool) or is_blank(value):
        raise ImportValidationError(f"{sheet} row {row_number}: {field} must be a whole number.")
    try:
        number = Decimal(str(value).strip())
    except (InvalidOperation, ValueError):
        raise ImportValidationError(
            f"{sheet} row {row_number}: {field} must be a whole number."
        ) from None
    if not number.is_finite() or number != number.to_integral_value():
        raise ImportValidationError(f"{sheet} row {row_number}: {field} must be a whole number.")
    result = int(number)
    if result < 0:
        raise ImportValidationError(f"{sheet} row {row_number}: {field} cannot be negative.")
    return result


def parse_decimal(value: Any, field: str, sheet: str, row_number: int) -> Decimal:
    try:
        number = Decimal(str(value).strip())
    except (InvalidOperation, ValueError):
        raise ImportValidationError(f"{sheet} row {row_number}: {field} must be numeric.") from None
    if not number.is_finite() or number < 0:
        raise ImportValidationError(f"{sheet} row {row_number}: {field} must be a non-negative number.")
    return number


def parse_optional_integer(
    value: Any, field: str, sheet: str, row_number: int
) -> int | None:
    if is_blank(value):
        return None
    return parse_integer(value, field, sheet, row_number)


def parse_bool(value: Any, field: str, sheet: str, row_number: int) -> bool | None:
    if is_blank(value):
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float, Decimal)) and value in (0, 1):
        return bool(value)
    normalized = clean_text(value).lower()
    if normalized in {"yes", "y", "true", "1"}:
        return True
    if normalized in {"no", "n", "false", "0"}:
        return False
    raise ImportValidationError(
        f"{sheet} row {row_number}: {field} must be Yes/No or True/False."
    )


def parse_text_array(value: Any) -> list[str]:
    if is_blank(value):
        return []
    return [part.strip() for part in str(value).split(";") if part.strip()]


def parse_uuid(value: Any, field: str, sheet: str, row_number: int) -> UUID | None:
    if is_blank(value):
        return None
    try:
        return UUID(clean_text(value))
    except (ValueError, AttributeError):
        raise ImportValidationError(
            f"{sheet} row {row_number}: {field} must be a valid UUID."
        ) from None


def parse_timestamp(value: Any, field: str, sheet: str, row_number: int) -> datetime | None:
    if is_blank(value):
        return None
    if isinstance(value, datetime):
        result = value
    elif isinstance(value, date):
        raise ImportValidationError(
            f"{sheet} row {row_number}: {field} needs a date and time with a timezone."
        )
    else:
        try:
            result = datetime.fromisoformat(clean_text(value).replace("Z", "+00:00"))
        except ValueError:
            raise ImportValidationError(
                f"{sheet} row {row_number}: {field} must be an ISO timestamp."
            ) from None
    if result.tzinfo is None or result.utcoffset() is None:
        raise ImportValidationError(
            f"{sheet} row {row_number}: {field} needs an explicit timezone."
        )
    return result


def optional_text(value: Any) -> str | None:
    text = clean_text(value)
    return text or None


def validate_review_status(row: dict[str, Any], sheet: str) -> str:
    status = clean_text(row.get("review_status")).upper()
    if status not in REVIEW_STATUSES:
        raise ImportValidationError(
            f"{sheet} row {row['__row_number']}: review_status must be "
            "Pending, Reviewed, or Needs Clarification."
        )
    return status


def parse_profile_payload(
    row: dict[str, Any], sheet: str
) -> dict[str, Any]:
    row_number = row["__row_number"]
    payload: dict[str, Any] = {}
    if not is_blank(row.get("monthly_income")):
        payload["monthly_income"] = parse_decimal(
            row["monthly_income"], "monthly_income", sheet, row_number
        )
    if not is_blank(row.get("gov_assistance_availed")):
        payload["gov_assistance_availed"] = parse_text_array(row["gov_assistance_availed"])
    for field in (
        "characteristics_remarks",
        "other_income_source",
        "flood_depth_level",
    ):
        text = optional_text(row.get(field))
        if text is not None:
            payload[field] = text
    for field in BOOLEAN_FIELDS & set(PROFILE_COLUMNS):
        value = parse_bool(row.get(field), field, sheet, row_number)
        if value is not None:
            payload[field] = value
    for field in ("dole_employment_year", "government_assistance_year"):
        value = parse_optional_integer(row.get(field), field, sheet, row_number)
        if value is not None:
            payload[field] = value
    return payload


def parse_workbook(path: Path) -> ImportBatch:
    workbook = load_workbook(path, read_only=True, data_only=False)
    try:
        household_headers = {
            clean_text(value).lower()
            for value in next(
                workbook["Households_Review"].iter_rows(
                    min_row=1, max_row=1, values_only=True
                ),
                (),
            )
        } if "Households_Review" in workbook.sheetnames else set()
        member_headers = {
            clean_text(value).lower()
            for value in next(
                workbook["Members_Review"].iter_rows(min_row=1, max_row=1, values_only=True),
                (),
            )
        } if "Members_Review" in workbook.sheetnames else set()
        require_columns(
            [], HOUSEHOLD_REQUIRED_COLUMNS, "Households_Review", household_headers
        )
        require_columns([], MEMBER_REQUIRED_COLUMNS, "Members_Review", member_headers)

        household_rows = read_sheet(workbook, "Households_Review")
        member_rows = read_sheet(workbook, "Members_Review")
        household_profile_rows = read_sheet(
            workbook, "Household_Profiles_Review", required=False
        )
        member_profile_rows = read_sheet(
            workbook, "Member_Profiles_Review", required=False
        )
        mapping_rows = read_sheet(workbook, "Source_Column_Map", required=False)
    finally:
        workbook.close()

    if not household_rows:
        raise ImportValidationError("No household rows were found in Households_Review.")
    reject_unmapped_columns(
        household_rows, HOUSEHOLD_ALLOWED_COLUMNS, "Households_Review"
    )
    reject_unmapped_columns(member_rows, MEMBER_ALLOWED_COLUMNS, "Members_Review")
    reject_unmapped_columns(
        household_profile_rows, PROFILE_ALLOWED_COLUMNS, "Household_Profiles_Review"
    )
    reject_unmapped_columns(
        member_profile_rows, PROFILE_ALLOWED_COLUMNS, "Member_Profiles_Review"
    )
    reject_unmapped_columns(mapping_rows, SOURCE_MAP_ALLOWED_COLUMNS, "Source_Column_Map")

    household_headers = set(household_rows[0]) - {"__row_number"}
    member_headers = set(member_rows[0]) - {"__row_number"} if member_rows else {
        clean_text(value).lower() for value in member_headers
    }

    household_records: list[dict[str, Any]] = []
    household_by_code: dict[str, dict[str, Any]] = {}
    seen_stub_codes: set[str] = set()
    warnings: list[str] = []
    for row in household_rows:
        row_number = row["__row_number"]
        validate_review_status(row, "Households_Review")
        raw_code = row.get("household_code")
        if not isinstance(raw_code, str):
            raise ImportValidationError(
                f"Households_Review row {row_number}: household_code must be stored as text "
                "in Excel so leading zeroes are preserved."
            )
        code = required_text(raw_code, "household_code", "Households_Review", row_number)
        if code in household_by_code:
            raise ImportValidationError(f"Duplicate household_code in workbook: {code}")

        head_sex = required_text(
            row.get("head_sex"), "head_sex", "Households_Review", row_number
        )
        if head_sex.upper() not in SEX_VALUES:
            raise ImportValidationError(
                f"Households_Review row {row_number}: head_sex must be Male or Female."
            )
        data: dict[str, Any] = {
            "household_code": code,
            "head_name": required_text(
                row.get("head_name"), "head_name", "Households_Review", row_number
            ),
            "head_age": parse_integer(
                row.get("head_age"), "head_age", "Households_Review", row_number
            ),
            "head_sex": head_sex.title(),
            "vulnerabilities": parse_text_array(row.get("vulnerabilities")),
        }
        for field in ("barangay", "purok", "head_occupation", "stub_code", "evacuee_status"):
            text = optional_text(row.get(field))
            if text is not None:
                data[field] = text
        stub_code = data.get("stub_code")
        if stub_code:
            if stub_code in seen_stub_codes:
                raise ImportValidationError(f"Duplicate stub_code in workbook: {stub_code}")
            seen_stub_codes.add(stub_code)
        for field in ("center_id", "designated_center_id", "room_id", "stub_issued_by"):
            value = parse_uuid(row.get(field), field, "Households_Review", row_number)
            if value is not None:
                data[field] = value
        issued = parse_bool(
            row.get("stub_issued"), "stub_issued", "Households_Review", row_number
        )
        if issued is not None:
            data["stub_issued"] = issued
        issued_at = parse_timestamp(
            row.get("stub_issued_at"), "stub_issued_at", "Households_Review", row_number
        )
        if issued_at is not None:
            data["stub_issued_at"] = issued_at
        if data.get("evacuee_status", "Active") not in {"Active", "Decamped"}:
            raise ImportValidationError(
                f"Households_Review row {row_number}: evacuee_status must be Active or Decamped."
            )
        record = {
            "data": data,
            "source": {
                "file": clean_text(row.get("source_file")) or path.name,
                "sheet": clean_text(row.get("source_sheet")) or "Households_Review",
                "row": row_number,
            },
            "review_status": clean_text(row.get("review_status")).title(),
        }
        household_records.append(record)
        household_by_code[code] = record

    member_records: list[dict[str, Any]] = []
    member_by_key: dict[tuple[str, int], dict[str, Any]] = {}
    head_member_counts: Counter[str] = Counter()
    for row in member_rows:
        row_number = row["__row_number"]
        validate_review_status(row, "Members_Review")
        code = required_text(
            row.get("household_code"), "household_code", "Members_Review", row_number
        )
        if code not in household_by_code:
            raise ImportValidationError(
                f"Members_Review row {row_number}: household_code {code!r} "
                "does not exist in Households_Review."
            )
        sequence = parse_integer(
            row.get("member_sequence"), "member_sequence", "Members_Review", row_number
        )
        if sequence < 1:
            raise ImportValidationError(
                f"Members_Review row {row_number}: member_sequence must be at least 1."
            )
        key = (code, sequence)
        if key in member_by_key:
            raise ImportValidationError(
                f"Duplicate member_sequence {sequence} for household_code {code}."
            )
        sex = required_text(row.get("sex"), "sex", "Members_Review", row_number)
        if sex.upper() not in SEX_VALUES:
            raise ImportValidationError(
                f"Members_Review row {row_number}: sex must be Male or Female."
            )
        age_unit = required_text(
            row.get("age_unit"), "age_unit", "Members_Review", row_number
        )
        if age_unit.lower() not in {"year", "years", "month", "months", "day", "days"}:
            raise ImportValidationError(
                f"Members_Review row {row_number}: age_unit must be Years, Months, or Days."
            )
        is_head = parse_bool(
            row.get("is_household_head"),
            "is_household_head",
            "Members_Review",
            row_number,
        )
        if is_head is None:
            raise ImportValidationError(
                f"Members_Review row {row_number}: is_household_head must be Yes or No."
            )
        if is_head:
            head_member_counts[code] += 1
        age = parse_integer(row.get("age"), "age", "Members_Review", row_number)
        age_value = parse_decimal(
            row.get("age_value"), "age_value", "Members_Review", row_number
        )
        if age_unit.lower().startswith(("month", "day")) and age != 0:
            raise ImportValidationError(
                f"Members_Review row {row_number}: age must be 0 for month/day age units."
            )
        data = {
            "full_name": required_text(
                row.get("full_name"), "full_name", "Members_Review", row_number
            ),
            "age": age,
            "age_value": age_value,
            "age_unit": age_unit.title(),
            "sex": sex.title(),
            "relationship_to_head": optional_text(row.get("relationship_to_head"))
            or "MEMBER",
            "occupation": optional_text(row.get("occupation")),
            "is_household_head": is_head,
            "vulnerabilities": parse_text_array(row.get("vulnerabilities")),
        }
        record = {
            "household_code": code,
            "member_sequence": sequence,
            "data": data,
            "source": {
                "file": clean_text(row.get("source_file")) or path.name,
                "sheet": clean_text(row.get("source_sheet")) or "Members_Review",
                "row": row_number,
            },
            "review_status": clean_text(row.get("review_status")).title(),
        }
        member_records.append(record)
        member_by_key[key] = record
    if any(count > 1 for count in head_member_counts.values()):
        raise ImportValidationError(
            "A household has more than one member marked is_household_head=Yes."
        )

    household_profile_records: list[dict[str, Any]] = []
    profile_households: set[str] = set()
    for row in household_profile_rows:
        row_number = row["__row_number"]
        validate_review_status(row, "Household_Profiles_Review")
        code = required_text(
            row.get("household_code"),
            "household_code",
            "Household_Profiles_Review",
            row_number,
        )
        if code not in household_by_code:
            raise ImportValidationError(
                f"Household_Profiles_Review row {row_number}: household_code {code!r} "
                "does not exist in Households_Review."
            )
        if code in profile_households:
            raise ImportValidationError(
                f"Duplicate household profile for household_code {code}."
            )
        profile_households.add(code)
        payload = parse_profile_payload(row, "Household_Profiles_Review")
        if payload:
            household_profile_records.append(
                {
                    "household_code": code,
                    "data": payload,
                    "source": {
                        "file": clean_text(row.get("source_file")) or path.name,
                        "sheet": clean_text(row.get("source_sheet"))
                        or "Household_Profiles_Review",
                        "row": row_number,
                    },
                    "review_status": clean_text(row.get("review_status")).title(),
                }
            )

    member_profile_records: list[dict[str, Any]] = []
    profile_members: set[tuple[str, int]] = set()
    for row in member_profile_rows:
        row_number = row["__row_number"]
        validate_review_status(row, "Member_Profiles_Review")
        code = required_text(
            row.get("household_code"),
            "household_code",
            "Member_Profiles_Review",
            row_number,
        )
        sequence = parse_integer(
            row.get("member_sequence"),
            "member_sequence",
            "Member_Profiles_Review",
            row_number,
        )
        key = (code, sequence)
        if key not in member_by_key:
            raise ImportValidationError(
                f"Member_Profiles_Review row {row_number}: "
                f"no matching member row for {code}/{sequence}."
            )
        if key in profile_members:
            raise ImportValidationError(
                f"Duplicate member profile for household/member {code}/{sequence}."
            )
        profile_members.add(key)
        payload = parse_profile_payload(row, "Member_Profiles_Review")
        if payload:
            member_profile_records.append(
                {
                    "household_code": code,
                    "member_sequence": sequence,
                    "data": payload,
                    "source": {
                        "file": clean_text(row.get("source_file")) or path.name,
                        "sheet": clean_text(row.get("source_sheet"))
                        or "Member_Profiles_Review",
                        "row": row_number,
                    },
                    "review_status": clean_text(row.get("review_status")).title(),
                }
            )

    mapping_rows = [
        {
            "decision_status": clean_text(row.get("decision_status")).title(),
            "source": {
                "file": clean_text(row.get("source_file")),
                "sheet": clean_text(row.get("source_sheet")),
                "column": clean_text(row.get("source_column_header")),
            },
            "canonical_sheet": clean_text(row.get("canonical_sheet")),
            "canonical_column": clean_text(row.get("canonical_column")),
            "rule": clean_text(row.get("mapping_rule_or_question")),
        }
        for row in mapping_rows
    ]

    all_records = (
        household_records
        + member_records
        + household_profile_records
        + member_profile_records
    )
    if any(record["review_status"] != "Reviewed" for record in all_records):
        warnings.append(
            "One or more data rows are not marked Reviewed; database insertion will be blocked."
        )
    if any(row["decision_status"] != "Approved" for row in mapping_rows):
        warnings.append(
            "One or more source-column mappings are not Approved; database insertion will be blocked."
        )
    return ImportBatch(
        households=household_records,
        members=member_records,
        household_profiles=household_profile_records,
        member_profiles=member_profile_records,
        mapping_rows=mapping_rows,
        warnings=warnings,
    )


def print_preview(batch: ImportBatch, workbook_path: Path) -> None:
    members_by_household: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for member in batch.members:
        members_by_household[member["household_code"]].append(member)

    print("\n" + "=" * 78)
    print(f"PRE-IMPORT PREVIEW — {workbook_path.name}")
    print("=" * 78)
    print(f"Households: {len(batch.households)}")
    print(f"Members: {len(batch.members)}")
    print(f"Household profiles: {len(batch.household_profiles)}")
    print(f"Member profiles: {len(batch.member_profiles)}")

    location_counts: Counter[tuple[str, str]] = Counter()
    for household in batch.households:
        data = household["data"]
        location_counts[(data.get("barangay", "Unassigned"), data.get("purok", "Unassigned"))] += 1
    if location_counts:
        print("\nHousehold counts by barangay / purok:")
        for (barangay, purok), count in sorted(location_counts.items()):
            print(f"  {barangay} / {purok}: {count}")

    household_profiles = {
        item["household_code"]: item["data"] for item in batch.household_profiles
    }
    member_profiles = {
        (item["household_code"], item["member_sequence"]): item["data"]
        for item in batch.member_profiles
    }
    print("\nRecords to be inserted:")
    for household in batch.households:
        data = household["data"]
        code = data["household_code"]
        print(
            f"\n[{code}] {data['head_name']} | age {data['head_age']} | "
            f"{data['head_sex']} | {data.get('barangay', 'Unassigned')} / "
            f"{data.get('purok', 'Unassigned')} | members: "
            f"{len(members_by_household[code])}"
        )
        print(f"  Household fields: {data}")
        profile = household_profiles.get(code)
        if profile:
            print(f"  Household profile: {profile}")
        for member in sorted(
            members_by_household[code], key=lambda item: item["member_sequence"]
        ):
            print(
                f"  - member #{member['member_sequence']}: {member['data']}"
            )
            profile = member_profiles.get((code, member["member_sequence"]))
            if profile:
                print(f"    member profile: {profile}")

    if batch.warnings:
        print("\nReview warnings:")
        for warning in batch.warnings:
            print(f"  - {warning}")
    print("=" * 78)


def get_connection_string() -> str:
    value = os.environ.get("SUPABASE_DB_URL") or os.environ.get("DATABASE_URL")
    if value:
        return value
    if not sys.stdin.isatty():
        raise ImportValidationError(
            "Set SUPABASE_DB_URL (or DATABASE_URL) before using --execute."
        )
    value = getpass.getpass("Supabase PostgreSQL connection string (input hidden): ").strip()
    if not value:
        raise ImportValidationError("A PostgreSQL connection string is required.")
    return value


def table_columns(connection: psycopg.Connection[Any], tables: list[str]) -> dict[str, set[str]]:
    rows = connection.execute(
        """
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ANY (%s)
        """,
        (tables,),
    ).fetchall()
    result: dict[str, set[str]] = defaultdict(set)
    for table_name, column_name in rows:
        result[table_name].add(column_name)
    return result


def require_table_columns(
    available: dict[str, set[str]], table: str, required: set[str]
) -> None:
    missing_table_or_columns = required - available.get(table, set())
    if missing_table_or_columns:
        raise ImportValidationError(
            f"Database table public.{table} is missing required columns: "
            f"{', '.join(sorted(missing_table_or_columns))}"
        )


def verify_database_schema(
    connection: psycopg.Connection[Any], batch: ImportBatch
) -> dict[str, set[str]]:
    tables = [
        "households",
        "household_members",
        "household_profiles",
        "household_member_profiles",
    ]
    available = table_columns(connection, tables)
    require_table_columns(
        available,
        "households",
        {
            "id", "household_code", "head_name", "head_age", "head_sex",
            "barangay", "purok", "stub_code", "vulnerabilities",
        },
    )
    require_table_columns(
        available,
        "household_members",
        {
            "id", "household_id", "full_name", "age", "age_value", "age_unit",
            "sex", "relationship_to_head", "occupation", "is_household_head",
            "vulnerabilities",
        },
    )
    for record in batch.households:
        require_table_columns(available, "households", set(record["data"]))
    for record in batch.members:
        require_table_columns(available, "household_members", set(record["data"]))
    if batch.household_profiles:
        require_table_columns(
            available, "household_profiles", {"id", "household_id"}
        )
        for record in batch.household_profiles:
            require_table_columns(available, "household_profiles", set(record["data"]))
    if batch.member_profiles:
        require_table_columns(
            available, "household_member_profiles", {"id", "household_member_id"}
        )
        for record in batch.member_profiles:
            require_table_columns(
                available, "household_member_profiles", set(record["data"])
            )
    return available


def count_rows(connection: psycopg.Connection[Any], table: str) -> int:
    result = connection.execute(
        sql.SQL("SELECT COUNT(*) FROM {}.{}").format(
            sql.Identifier("public"), sql.Identifier(table)
        )
    ).fetchone()
    return int(result[0])


def table_counts(connection: psycopg.Connection[Any], available: dict[str, set[str]]) -> dict[str, int]:
    table_names = [
        table
        for table in (
            "households",
            "household_members",
            "household_profiles",
            "household_member_profiles",
        )
        if table in available
    ]
    return {table: count_rows(connection, table) for table in table_names}


def find_existing_values(
    connection: psycopg.Connection[Any],
    table: str,
    column: str,
    values: list[str],
) -> list[str]:
    if not values:
        return []
    rows = connection.execute(
        sql.SQL("SELECT {} FROM {}.{} WHERE {} = ANY (%s)").format(
            sql.Identifier(column),
            sql.Identifier("public"),
            sql.Identifier(table),
            sql.Identifier(column),
        ),
        (values,),
    ).fetchall()
    return [str(row[0]) for row in rows]


def database_preflight(
    connection_string: str, batch: ImportBatch
) -> tuple[dict[str, int], list[str], list[str]]:
    with psycopg.connect(
        connection_string, sslmode="require", connect_timeout=10
    ) as connection:
        with connection.transaction():
            connection.execute("SET TRANSACTION READ ONLY")
            available = verify_database_schema(connection, batch)
            counts = table_counts(connection, available)
            existing_codes = find_existing_values(
                connection,
                "households",
                "household_code",
                [item["data"]["household_code"] for item in batch.households],
            )
            existing_stubs = find_existing_values(
                connection,
                "households",
                "stub_code",
                [
                    item["data"]["stub_code"]
                    for item in batch.households
                    if item["data"].get("stub_code")
                ],
            )
    return counts, existing_codes, existing_stubs


def make_insert_payload(record: dict[str, Any], foreign_key: str, foreign_id: str) -> dict[str, Any]:
    return {foreign_key: foreign_id, **record["data"]}


def insert_row(
    connection: psycopg.Connection[Any], table: str, payload: dict[str, Any]
) -> dict[str, Any]:
    columns = list(payload)
    statement = sql.SQL("INSERT INTO {}.{} ({}) VALUES ({}) RETURNING *").format(
        sql.Identifier("public"),
        sql.Identifier(table),
        sql.SQL(", ").join(sql.Identifier(column) for column in columns),
        sql.SQL(", ").join(sql.Placeholder() for _ in columns),
    )
    cursor = connection.execute(statement, [payload[column] for column in columns])
    names = [item.name for item in cursor.description]
    return dict(zip(names, cursor.fetchone()))


def comparable(value: Any) -> Any:
    if isinstance(value, list):
        return tuple(comparable(item) for item in value)
    if isinstance(value, Decimal):
        return value.normalize()
    return value


def verify_imported_rows(
    connection: psycopg.Connection[Any],
    batch: ImportBatch,
    inserted_households: dict[str, dict[str, Any]],
    inserted_members: dict[tuple[str, int], dict[str, Any]],
    inserted_household_profiles: list[dict[str, Any]],
    inserted_member_profiles: list[dict[str, Any]],
) -> None:
    for record in batch.households:
        data = record["data"]
        code = data["household_code"]
        row = inserted_households[code]
        for column, expected in data.items():
            if comparable(row[column]) != comparable(expected):
                raise ImportValidationError(
                    f"Post-insert verification failed for household {code}, field {column}."
                )

    members_by_household: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for member in batch.members:
        members_by_household[member["household_code"]].append(member)
    for code, members in members_by_household.items():
        household_id = inserted_households[code]["id"]
        rows = connection.execute(
            """
            SELECT full_name, age, age_value, age_unit, sex, relationship_to_head,
                   occupation, is_household_head, vulnerabilities
            FROM public.household_members
            WHERE household_id = %s
            """,
            (household_id,),
        ).fetchall()
        expected = Counter(
            tuple(comparable(member["data"][column]) for column in (
                "full_name", "age", "age_value", "age_unit", "sex",
                "relationship_to_head", "occupation", "is_household_head",
                "vulnerabilities",
            ))
            for member in members
        )
        actual = Counter(tuple(comparable(value) for value in row) for row in rows)
        if actual != expected:
            raise ImportValidationError(
                f"Post-insert member comparison failed for household {code}."
            )

    for inserted, table, foreign_key, foreign_id_key in (
        (
            inserted_household_profiles,
            "household_profiles",
            "household_id",
            "household_code",
        ),
        (
            inserted_member_profiles,
            "household_member_profiles",
            "household_member_id",
            "member_key",
        ),
    ):
        for entry in inserted:
            row = entry["row"]
            payload = entry["payload"]
            if foreign_key not in row:
                raise ImportValidationError(f"Missing relationship after inserting into {table}.")
            for column, expected in payload.items():
                if column == foreign_key:
                    continue
                if comparable(row[column]) != comparable(expected):
                    raise ImportValidationError(
                        f"Post-insert verification failed for {table}.{column}."
                    )


def execute_import(connection_string: str, batch: ImportBatch) -> dict[str, tuple[int, int, int]]:
    expected_delta = {
        "households": len(batch.households),
        "household_members": len(batch.members),
        "household_profiles": len(batch.household_profiles),
        "household_member_profiles": len(batch.member_profiles),
    }
    with psycopg.connect(
        connection_string, sslmode="require", connect_timeout=10
    ) as connection:
        with connection.transaction():
            connection.execute("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ")
            available = verify_database_schema(connection, batch)
            before = table_counts(connection, available)

            codes = [item["data"]["household_code"] for item in batch.households]
            existing_codes = find_existing_values(
                connection, "households", "household_code", codes
            )
            if existing_codes:
                raise ImportValidationError(
                    "These household_code values already exist; nothing was inserted: "
                    + ", ".join(existing_codes)
                )
            stub_codes = [
                item["data"]["stub_code"]
                for item in batch.households
                if item["data"].get("stub_code")
            ]
            existing_stubs = find_existing_values(
                connection, "households", "stub_code", stub_codes
            )
            if existing_stubs:
                raise ImportValidationError(
                    "These stub_code values already exist; nothing was inserted: "
                    + ", ".join(existing_stubs)
                )

            inserted_households: dict[str, dict[str, Any]] = {}
            for record in batch.households:
                row = insert_row(connection, "households", record["data"])
                inserted_households[record["data"]["household_code"]] = row

            inserted_members: dict[tuple[str, int], dict[str, Any]] = {}
            for record in batch.members:
                household_id = inserted_households[record["household_code"]]["id"]
                payload = make_insert_payload(record, "household_id", household_id)
                row = insert_row(connection, "household_members", payload)
                inserted_members[
                    (record["household_code"], record["member_sequence"])
                ] = row

            inserted_household_profiles: list[dict[str, Any]] = []
            for record in batch.household_profiles:
                household_id = inserted_households[record["household_code"]]["id"]
                payload = make_insert_payload(record, "household_id", household_id)
                row = insert_row(connection, "household_profiles", payload)
                inserted_household_profiles.append({"row": row, "payload": payload})

            inserted_member_profiles: list[dict[str, Any]] = []
            for record in batch.member_profiles:
                member_key = (record["household_code"], record["member_sequence"])
                member_id = inserted_members[member_key]["id"]
                payload = make_insert_payload(record, "household_member_id", member_id)
                row = insert_row(connection, "household_member_profiles", payload)
                inserted_member_profiles.append({"row": row, "payload": payload})

            verify_imported_rows(
                connection,
                batch,
                inserted_households,
                inserted_members,
                inserted_household_profiles,
                inserted_member_profiles,
            )
            after = table_counts(connection, available)
            for table, expected in expected_delta.items():
                if table in before and after[table] - before[table] != expected:
                    raise ImportValidationError(
                        f"Post-insert count comparison failed for {table}; transaction rolled back."
                    )
        return {
            table: (before.get(table, 0), after.get(table, 0), expected)
            for table, expected in expected_delta.items()
            if table in before
        }


def check_execution_review(batch: ImportBatch) -> None:
    unreviewed = [
        record
        for record in (
            batch.households
            + batch.members
            + batch.household_profiles
            + batch.member_profiles
        )
        if record["review_status"] != "Reviewed"
    ]
    if unreviewed:
        raise ImportValidationError(
            f"{len(unreviewed)} data row(s) are not marked Reviewed; import blocked."
        )
    if any(row["decision_status"] != "Approved" for row in batch.mapping_rows):
        raise ImportValidationError(
            "Every populated Source_Column_Map row must be marked Approved; import blocked."
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Preview or import one reviewed Household Consolidation workbook. "
            "Without --execute, the script never connects to or writes to the database."
        )
    )
    parser.add_argument("workbook", type=Path, help="Path to one .xlsx consolidation workbook")
    parser.add_argument(
        "--execute",
        action="store_true",
        help="After preview, require an exact typed confirmation and import atomically.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    workbook_path = args.workbook.expanduser().resolve()
    if not workbook_path.is_file() or workbook_path.suffix.lower() != ".xlsx":
        print("Error: provide the path to one existing .xlsx workbook.", file=sys.stderr)
        return 2
    if workbook_path.name.startswith("~$"):
        print("Error: the workbook appears to be open in Excel; close it first.", file=sys.stderr)
        return 2

    try:
        batch = parse_workbook(workbook_path)
        connection_string = get_connection_string() if args.execute else None
        preflight: tuple[dict[str, int], list[str], list[str]] | None = None
        if connection_string:
            check_execution_review(batch)
            preflight = database_preflight(connection_string, batch)

        print_preview(batch, workbook_path)
        if not args.execute:
            print("\nPreview only. No database connection or insert was performed.")
            return 0

        if preflight is None:
            raise ImportValidationError("Database preflight did not complete.")
        before, existing_codes, existing_stubs = preflight
        print("\nDatabase preflight:")
        for table, count in sorted(before.items()):
            print(f"  {table}: {count} rows before")
        if existing_codes or existing_stubs:
            if existing_codes:
                print("  Existing household codes: " + ", ".join(existing_codes))
            if existing_stubs:
                print("  Existing stub codes: " + ", ".join(existing_stubs))
            raise ImportValidationError(
                "Duplicate database values found; nothing was inserted."
            )

        print("\nNo duplicate household_code or stub_code values were found.")
        expected_phrase = f"INSERT {workbook_path.name}"
        print("Review the complete preview above before continuing.")
        confirmation = input(f'Type exactly "{expected_phrase}" to insert this workbook: ').strip()
        if confirmation != expected_phrase:
            print("Confirmation did not match. No data was inserted.")
            return 0

        results = execute_import(connection_string, batch)
        print("\nImport committed and verified:")
        for table, (old_count, new_count, inserted_count) in results.items():
            print(
                f"  {table}: before {old_count}, after {new_count}, "
                f"inserted {inserted_count}"
            )
        print(
            f"\nVerified {len(batch.households)} household(s), "
            f"{len(batch.members)} member(s), "
            f"{len(batch.household_profiles)} household profile(s), and "
            f"{len(batch.member_profiles)} member profile(s)."
        )
        return 0
    except (ImportValidationError, psycopg.Error, OSError, ValueError) as error:
        print(f"\nImport stopped: {error}", file=sys.stderr)
        print("No changes were committed.", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
