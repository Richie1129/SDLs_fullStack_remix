#!/usr/bin/env python3
"""
從教育部高中名單 Excel (high.xlsx) 產生 schools.json
執行方式：python3 sdl-backend-main/scripts/parseSchools.py
"""
import json
import re
import os
import openpyxl

XLSX_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'high.xlsx')
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), 'schools.json')

def strip_city_prefix(city):
    """移除縣市前綴，例如 '[01]新北市' → '新北市'"""
    if not city:
        return None
    return re.sub(r'^\[\d+\]', '', str(city)).strip()

def parse_schools():
    wb = openpyxl.load_workbook(XLSX_PATH, read_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))

    # Row 0: 標題, Row 1: 空白, Row 2: Header, Row 3+: 資料
    schools = []
    for row in rows[3:]:
        code = row[0]
        name = row[1]
        school_type = row[2]
        city = strip_city_prefix(row[3])

        if not code or not name:
            continue

        schools.append({
            'code': str(code).strip(),
            'name': str(name).strip(),
            'type': str(school_type).strip() if school_type else None,
            'city': city
        })

    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(schools, f, ensure_ascii=False, indent=2)

    print(f'已產生 {len(schools)} 筆學校資料 → {OUTPUT_PATH}')

if __name__ == '__main__':
    parse_schools()
