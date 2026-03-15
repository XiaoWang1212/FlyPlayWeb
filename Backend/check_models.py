import google.generativeai as genai
from config import Config

genai.configure(api_key=Config.GEMINI_API_KEY)

print("可用的模型列表：")
print("=" * 60)

for model in genai.list_models():
    print(f"模型名稱: {model.name}")
    print(f"支持方法: {model.supported_generation_methods}")
    print("-" * 60)
