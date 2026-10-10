"""
Python PPTX Generator for PERN Quotation Generator
Implements Template Subtraction Method using python-pptx / zipfile
"""
import sys
import json
import os
import re
import shutil
import zipfile

def generate_ppt(payload_path):
    with open(payload_path, 'r', encoding='utf-8') as f:
        payload = json.load(f)

    master_path = payload.get('masterTemplatePath')
    output_path = payload.get('outputPath')
    selected_variant_ids = set(str(v) for v in payload.get('selectedVariantIds', []))
    all_variants = payload.get('allVariants', [])
    client_info = payload.get('clientInfo', {})
    rep_info = payload.get('repInfo', {})
    snips = payload.get('snips', {}) # variantId -> filePath

    if not os.path.exists(master_path):
        raise FileNotFoundError(f"Master template not found at {master_path}")

    # Determine slide indices to delete (1-based)
    slides_to_delete = set()
    variant_quotation_slides = {}

    for v in all_variants:
        v_id = str(v.get('id'))
        indices = v.get('slideIndices', [])
        if isinstance(indices, str):
            try:
                indices = json.loads(indices)
            except Exception:
                indices = []
        if isinstance(indices, list):
            if v_id not in selected_variant_ids:
                for idx in indices:
                    slides_to_delete.add(int(idx))
            elif len(indices) >= 3:
                # 3rd slide is quotation slide
                variant_quotation_slides[int(indices[2])] = v_id

    # Create temporary directory for unzipping PPTX
    temp_dir = os.path.join(os.path.dirname(output_path), f"temp_{os.getpid()}")
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)
    os.makedirs(temp_dir, exist_ok=True)

    try:
        with zipfile.ZipFile(master_path, 'r') as zip_ref:
            zip_ref.extractall(temp_dir)

        # 1. Parse presentation.xml.rels
        rels_path = os.path.join(temp_dir, 'ppt', '_rels', 'presentation.xml.rels')
        with open(rels_path, 'r', encoding='utf-8') as f:
            rels_content = f.read()

        rel_map = {}
        for match in re.finditer(r'<Relationship\s+[^>]*?Id="([^"]+)"[^>]*?Type="[^"]*?slide"[^>]*?Target="([^"]+)"', rels_content):
            rel_map[match.group(1)] = match.group(2)

        # 2. Parse presentation.xml
        pres_path = os.path.join(temp_dir, 'ppt', 'presentation.xml')
        with open(pres_path, 'r', encoding='utf-8') as f:
            pres_content = f.read()

        sld_matches = list(re.finditer(r'<p:sldId\s+[^>]*?id="([^"]+)"[^>]*?r:id="([^"]+)"[^>]*?/>', pres_content))
        
        kept_slides = []
        deleted_slides = []

        for idx, m in enumerate(sld_matches, start=1):
            r_id = m.group(2)
            target = rel_map.get(r_id, f"slides/slide{idx}.xml")
            item = {
                'displayIndex': idx,
                'id': m.group(1),
                'rId': r_id,
                'target': target,
                'tag': m.group(0)
            }
            if idx in slides_to_delete:
                deleted_slides.append(item)
            else:
                kept_slides.append(item)

        # Update presentation.xml
        new_sld_id_list = "".join(f'<p:sldId id="{s["id"]}" r:id="{s["rId"]}"/>' for s in kept_slides)
        pres_content = re.sub(r'<p:sldIdLst>[\s\S]*?</p:sldIdLst>', f'<p:sldIdLst>{new_sld_id_list}</p:sldIdLst>', pres_content)
        with open(pres_path, 'w', encoding='utf-8') as f:
            f.write(pres_content)

        # 3. Clean up [Content_Types].xml & deleted slide files
        content_types_path = os.path.join(temp_dir, '[Content_Types].xml')
        with open(content_types_path, 'r', encoding='utf-8') as f:
            ct_content = f.read()

        for del_slide in deleted_slides:
            part_name = f"/ppt/{del_slide['target'].lstrip('/')}"
            ct_content = re.sub(rf'<Override\s+PartName="{re.escape(part_name)}"[^>]*?/>', '', ct_content)
            # Remove slide file and slide rels
            slide_file = os.path.join(temp_dir, 'ppt', del_slide['target'])
            if os.path.exists(slide_file):
                os.remove(slide_file)
            slide_rel_file = os.path.join(temp_dir, 'ppt', 'slides', '_rels', f"{os.path.basename(del_slide['target'])}.rels")
            if os.path.exists(slide_rel_file):
                os.remove(slide_rel_file)

        with open(content_types_path, 'w', encoding='utf-8') as f:
            f.write(ct_content)

        # 4. Replacements: Footer and Cover Page
        client_name = client_info.get('name', 'Client')
        client_contact = client_info.get('contact', client_info.get('contactNumber', ''))
        client_email = client_info.get('email', '')
        location = client_info.get('location', '')
        date_str = client_info.get('date', '')

        rep_name = rep_info.get('name', '')
        rep_contact = rep_info.get('contact', rep_info.get('contactNumber', ''))
        rep_email = rep_info.get('email', '')

        new_footer = f"{client_name} | {location} | {client_contact}"
        old_footer = "Mr. Aravindan | Individual Villa Adyar | 7418414780"

        # Apply to each kept slide
        for new_num, s in enumerate(kept_slides, start=1):
            slide_file = os.path.join(temp_dir, 'ppt', s['target'])
            if not os.path.exists(slide_file):
                continue

            with open(slide_file, 'r', encoding='utf-8') as f:
                slide_xml = f.read()

            # Renumber slide
            old_num = s['displayIndex']
            slide_xml = re.sub(rf'<a:t>\s*{old_num}\s*</a:t>', f'<a:t>{new_num}</a:t>', slide_xml)

            # Footer
            slide_xml = slide_xml.replace(old_footer, new_footer)

            # Cover slide (slide 1)
            if s['displayIndex'] == 1:
                slide_xml = re.sub(r'Mr\.\s*Aravindan', client_name, slide_xml)
                slide_xml = re.sub(r'7418414780', client_contact, slide_xml)
                slide_xml = re.sub(r'Webapp\.cookscape@gmail\.com', client_email, slide_xml)
                slide_xml = re.sub(r'Individual Villa Adyar', location, slide_xml)
                if date_str:
                    slide_xml = re.sub(r'10/10/2026', date_str, slide_xml)
                slide_xml = re.sub(r'Mr\.\s*Abishek', rep_name, slide_xml)
                slide_xml = re.sub(r'93611\s*84787', rep_contact, slide_xml)
                slide_xml = re.sub(r'designs\.cookscape@gmail\.com', rep_email, slide_xml)

            # Save modified slide
            with open(slide_file, 'w', encoding='utf-8') as f:
                f.write(slide_xml)

        # 5. Zip back into output PPTX
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        if os.path.exists(output_path):
            os.remove(output_path)

        with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zip_out:
            for root, dirs, files in os.walk(temp_dir):
                for file in files:
                    full_p = os.path.join(root, file)
                    rel_p = os.path.relpath(full_p, temp_dir)
                    zip_out.write(full_p, rel_p)

        file_size = os.path.getsize(output_path)
        print(json.dumps({
            "status": "success",
            "filePath": output_path,
            "slideCount": len(kept_slides),
            "fileSize": file_size
        }))

    finally:
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Missing payload path argument"}))
        sys.exit(1)
    generate_ppt(sys.argv[1])
