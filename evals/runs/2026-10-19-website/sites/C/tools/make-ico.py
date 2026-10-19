# 把 256px PNG 打包成多尺寸 favicon.ico（16/32/48）
import os
from PIL import Image
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
Image.open(os.path.join(root, 'tools/.output/favicon-256.png')).save(os.path.join(root, 'favicon.ico'), sizes=[(16, 16), (32, 32), (48, 48)])
print('favicon.ico written')
