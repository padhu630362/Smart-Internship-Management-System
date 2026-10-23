import docx

doc = docx.Document('InternHub_Complete_Feature_Wise_Test_Report.docx')
with open('scratch/tables_summary.txt', 'w', encoding='utf-8') as f:
    for i, t in enumerate(doc.tables):
        headers = [c.text.strip().replace('\n', ' ') for c in t.rows[0].cells]
        f.write(f"Table {i} (rows={len(t.rows)}, cols={len(t.columns)}): {headers}\n")
print("Exported tables summary")

