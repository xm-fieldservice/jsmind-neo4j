import json

with open('column-sources/mindmap/mindmap_base.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

def find_node(node, topic):
    if node.get('topic') == topic:
        return node.get('data', {}).get('content', '')
    if 'children' in node:
        for child in node['children']:
            result = find_node(child, topic)
            if result is not None:
                return result
    return None

content = find_node(data['data'], '脑图内容')
print(content)
