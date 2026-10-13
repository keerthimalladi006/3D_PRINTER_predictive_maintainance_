"""
GLB Scene Graph Inspector
Inspects the digital_twin.glb file and reports its complete scene graph.
"""

import json
from pathlib import Path
import struct
import sys

# Since we don't have glTF libraries installed, we'll try to read basic info
# or report that we need glTF inspection tools

GLB_PATH = Path(r"D:\3d_printer_predictive_maintanance\input\3d_printer.glb")

def inspect_glb_basic():
    """Basic GLB file inspection."""
    if not GLB_PATH.exists():
        print(f"GLB file not found: {GLB_PATH}")
        return
    
    file_size = GLB_PATH.stat().st_size
    print(f"GLB File: {GLB_PATH}")
    print(f"File Size: {file_size:,} bytes ({file_size / 1024 / 1024:.2f} MB)")
    
    # Read GLB header
    with open(GLB_PATH, 'rb') as f:
        # GLB header: magic (4 bytes), version (4 bytes), length (4 bytes)
        magic = f.read(4)
        version = struct.unpack('<I', f.read(4))[0]
        length = struct.unpack('<I', f.read(4))[0]
        
        print(f"\nGLB Header:")
        print(f"  Magic: {magic}")
        print(f"  Version: {version}")
        print(f"  Total Length: {length}")
        
        if magic != b'glTF':
            print("  WARNING: Invalid GLB magic bytes")
        
        # Read JSON chunk
        chunk_length = struct.unpack('<I', f.read(4))[0]
        chunk_type = f.read(4)
        
        print(f"\nFirst Chunk:")
        print(f"  Type: {chunk_type}")
        print(f"  Length: {chunk_length}")
        
        if chunk_type == b'JSON':
            json_data = f.read(chunk_length)
            try:
                gltf = json.loads(json_data.decode('utf-8'))
                
                print(f"\nglTF Version: {gltf.get('asset', {}).get('version')}")
                print(f"Generator: {gltf.get('asset', {}).get('generator', 'Unknown')}")
                
                # Count nodes and meshes
                nodes = gltf.get('nodes', [])
                meshes = gltf.get('meshes', [])
                materials = gltf.get('materials', [])
                
                print(f"\nScene Statistics:")
                print(f"  Nodes: {len(nodes)}")
                print(f"  Meshes: {len(meshes)}")
                print(f"  Materials: {len(materials)}")
                print(f"  Scenes: {len(gltf.get('scenes', []))}")
                
                # Print node hierarchy
                print(f"\nNode Hierarchy:")
                for i, node in enumerate(nodes):
                    name = node.get('name', f'Node_{i}')
                    mesh_index = node.get('mesh')
                    children = node.get('children', [])
                    
                    mesh_info = f" (Mesh {mesh_index})" if mesh_index is not None else ""
                    children_info = f" ({len(children)} children)" if children else ""
                    
                    print(f"  [{i}] {name}{mesh_info}{children_info}")
                    
                    if children:
                        for child_idx in children:
                            child = nodes[child_idx]
                            child_name = child.get('name', f'Node_{child_idx}')
                            child_mesh = child.get('mesh')
                            child_mesh_info = f" (Mesh {child_mesh})" if child_mesh is not None else ""
                            print(f"    - [{child_idx}] {child_name}{child_mesh_info}")
                
                # Print mesh names
                print(f"\nMesh Details:")
                for i, mesh in enumerate(meshes):
                    name = mesh.get('name', f'Mesh_{i}')
                    primitives = mesh.get('primitives', [])
                    print(f"  [{i}] {name} ({len(primitives)} primitive(s))")
                
                # Save full glTF JSON for reference
                output_path = GLB_PATH.parent / "glb_inspection_3d_printer.json"
                with open(output_path, 'w', encoding='utf-8') as out:
                    json.dump(gltf, out, indent=2, ensure_ascii=False)
                print(f"\nFull glTF JSON saved to: {output_path}")
                
            except Exception as e:
                print(f"Error parsing JSON chunk: {e}")
        else:
            print(f"  First chunk is not JSON (type: {chunk_type})")

if __name__ == "__main__":
    # Set UTF-8 encoding for Windows console
    if sys.platform == 'win32':
        import codecs
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
        sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')
    inspect_glb_basic()
