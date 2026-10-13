import json

with open('input/glb_inspection_3d_printer.json', 'r') as f:
    data = json.load(f)
    print('=== Nodes ===')
    for node in data['nodes']:
        print(f"Name: {node.get('name', 'unnamed')}")
        print(f"  Mesh: {node.get('mesh', 'none')}")
        print(f"  Translation: {node.get('translation', 'none')}")
        print(f"  Scale: {node.get('scale', 'none')}")
        print()
