import json
import os

file_path = r'c:\Users\Admin\Desktop\erp_build\src\i18n\fr.json'

with open(file_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Since it's a nested dictionary, we need to handle it carefully if it's nested.
# But looking at the file, it's mostly top-level keys with nested objects.
# The error "Duplicate object key" in JSON usually means multiple keys at the same level.

def clean_duplicates(obj):
    if isinstance(obj, dict):
        new_dict = {}
        for k, v in obj.items():
            new_dict[k] = clean_duplicates(v)
        return new_dict
    elif isinstance(obj, list):
        return [clean_duplicates(i) for i in obj]
    else:
        return obj

# json.load(f) already handles duplicates by taking the last one (usually).
# So just saving it back might fix the "duplicate key" error if it was a formatting thing.
# But wait, if there are multiple keys in the string, json.load will just pick one.

with open(file_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Cleaned fr.json")
