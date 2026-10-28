"""Consistent local backup. Quiesce the app for a coordinated database + document snapshot."""
import argparse
import sqlite3
import shutil
from pathlib import Path

p=argparse.ArgumentParser()
p.add_argument('data_directory',type=Path)
p.add_argument('destination',type=Path)
args=p.parse_args()
source=args.data_directory.resolve()
destination=args.destination.resolve()
if not (source/'ehr.db').is_file(): raise SystemExit('Source database does not exist')
if destination.exists(): raise SystemExit('Destination already exists; refusing to overwrite')
if source==destination or source in destination.parents: raise SystemExit('Backup must be outside the source data directory')
destination.mkdir(parents=True)
with sqlite3.connect(source/'ehr.db') as src,sqlite3.connect(destination/'ehr.db') as dst:
    src.backup(dst)
if (source/'documents').exists(): shutil.copytree(source/'documents',destination/'documents')
print('Backup created. Protect this directory as sensitive data when used beyond synthetic development.')
