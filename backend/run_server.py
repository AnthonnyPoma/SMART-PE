import uvicorn
import os

if __name__ == "__main__":
    try:
        # Correr sin reload para simplificar el stack trace y evitar subprocesos
        uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=False) 
    except Exception as e:
        print("CRITICAL SERVER ERROR:")
        print(e)
        import traceback
        traceback.print_exc()
