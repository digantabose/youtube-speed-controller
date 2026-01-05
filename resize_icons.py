from PIL import Image
import os

def resize_icon():
    source_path = r"g:\Antigravity\youtube custom speed\youtube-speed-controller\icons\icon.png"
    icons_dir = os.path.dirname(source_path)
    
    if not os.path.exists(source_path):
        print(f"Error: Source file not found at {source_path}")
        return

    try:
        with Image.open(source_path) as img:
            sizes = [16, 32, 48, 128]
            for size in sizes:
                new_img = img.resize((size, size), Image.Resampling.LANCZOS)
                output_path = os.path.join(icons_dir, f"icon{size}.png")
                new_img.save(output_path)
                print(f"Created {output_path}")
    except Exception as e:
        print(f"Error processing image: {e}")

if __name__ == "__main__":
    resize_icon()
