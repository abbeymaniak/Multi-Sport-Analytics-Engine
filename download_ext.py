#!/usr/bin/env python3
import os
import urllib.request
import zipfile
import struct

def download_and_extract_extension(extension_id, output_dir):
    print(f"Downloading extension {extension_id}...")
    url = f"https://clients2.google.com/service/update2/crx?response=redirect&prodversion=125.0.0.0&acceptformat=crx2,crx3&x=id%3D{extension_id}%26uc"
    
    crx_path = "extension.crx"
    
    # Send request with a real User-Agent to avoid blocks
    req = urllib.request.Request(
        url,
        headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'}
    )
    
    import ssl
    context = ssl._create_unverified_context()
    
    with urllib.request.urlopen(req, context=context) as response, open(crx_path, 'wb') as out_file:
        out_file.write(response.read())
        
    print("Extracting extension...")
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    # Unzip CRX (handling CRX headers)
    with open(crx_path, 'rb') as f:
        header = f.read(4)
        if header == b'Cr24':
            version = struct.unpack('<I', f.read(4))[0]
            if version == 2:
                pubkey_len = struct.unpack('<I', f.read(4))[0]
                sig_len = struct.unpack('<I', f.read(4))[0]
                f.seek(16 + pubkey_len + sig_len)
            elif version == 3:
                header_len = struct.unpack('<I', f.read(4))[0]
                f.seek(12 + header_len)
            else:
                raise ValueError(f"Unsupported CRX version: {version}")
        else:
            # Not a CRX header, might be a raw ZIP already
            f.seek(0)
            
        # Write the remaining ZIP data to a temporary file
        zip_data = f.read()
        temp_zip = "temp_ext.zip"
        with open(temp_zip, "wb") as temp_f:
            temp_f.write(zip_data)
            
    with zipfile.ZipFile(temp_zip, 'r') as zip_ref:
        zip_ref.extractall(output_dir)
        
    # Clean up temp files
    os.remove(crx_path)
    os.remove(temp_zip)
    print(f"[SUCCESS] Extension extracted to: {os.path.abspath(output_dir)}")

if __name__ == "__main__":
    download_and_extract_extension("eppiocemhmnlbhjplcgkofciiegomcon", "urban_vpn")
