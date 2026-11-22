import os
from PIL import Image, ImageDraw

SRC_PATH = '/Users/a/.gemini/antigravity/brain/4819cdb2-e206-426d-bf9f-a9a15a7e5a6d/.user_uploaded/media_1795329191050_4307b6da.jpg'
MOBILE_DIR = '/Users/a/Desktop/Ilmchi/apps/mobile'
RES_DIR = os.path.join(MOBILE_DIR, 'android/app/src/main/res')

src_img = Image.open(SRC_PATH).convert('RGBA')

# 1. assets/icon.png (1024x1024)
icon_path = os.path.join(MOBILE_DIR, 'assets/icon.png')
src_img.save(icon_path, format='PNG')
print(f"Saved: {icon_path}")

# 2. assets/adaptive-icon.png (1024x1024)
# For adaptive icon, scale the content slightly so it fits inside the safe zone (66% = ~676px)
adaptive_canvas = Image.new('RGBA', (1024, 1024), (255, 255, 255, 0))
scaled_w, scaled_h = int(1024 * 0.76), int(1024 * 0.76)
scaled_src = src_img.resize((scaled_w, scaled_h), Image.Resampling.LANCZOS)
paste_x = (1024 - scaled_w) // 2
paste_y = (1024 - scaled_h) // 2
adaptive_canvas.paste(scaled_src, (paste_x, paste_y), scaled_src)

adaptive_path = os.path.join(MOBILE_DIR, 'assets/adaptive-icon.png')
adaptive_canvas.save(adaptive_path, format='PNG')
print(f"Saved: {adaptive_path}")

# 3. Android mipmaps
MIPMAPS = {
    'mipmap-mdpi': (48, 108),
    'mipmap-hdpi': (72, 162),
    'mipmap-xhdpi': (96, 216),
    'mipmap-xxhdpi': (144, 324),
    'mipmap-xxxhdpi': (192, 432),
}

for folder, (size, fg_size) in MIPMAPS.items():
    folder_path = os.path.join(RES_DIR, folder)
    os.makedirs(folder_path, exist_ok=True)
    
    # Standard launcher
    launcher = src_img.resize((size, size), Image.Resampling.LANCZOS)
    launcher_path = os.path.join(folder_path, 'ic_launcher.webp')
    launcher.save(launcher_path, format='WEBP', quality=95)
    
    # Round launcher (circular mask)
    round_img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    mask = Image.new('L', (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size - 1, size - 1), fill=255)
    round_img.paste(launcher, (0, 0), mask)
    round_path = os.path.join(folder_path, 'ic_launcher_round.webp')
    round_img.save(round_path, format='WEBP', quality=95)
    
    # Foreground adaptive launcher
    fg_canvas = Image.new('RGBA', (fg_size, fg_size), (0, 0, 0, 0))
    fg_scaled_w = int(fg_size * 0.76)
    fg_scaled = src_img.resize((fg_scaled_w, fg_scaled_w), Image.Resampling.LANCZOS)
    fg_offset = (fg_size - fg_scaled_w) // 2
    fg_canvas.paste(fg_scaled, (fg_offset, fg_offset), fg_scaled)
    fg_path = os.path.join(folder_path, 'ic_launcher_foreground.webp')
    fg_canvas.save(fg_path, format='WEBP', quality=95)
    
    print(f"Generated {folder}: ic_launcher, ic_launcher_round, ic_launcher_foreground")

print("All icon assets successfully generated!")
