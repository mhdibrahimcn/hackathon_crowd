from fastapi import APIRouter

router = APIRouter()

@router.post("/chat/send")
async def send_message(data: dict):
    return {"message": "Message sent"}

@router.get("/chat/messages")
async def get_messages(user_id: str):
    return {"messages": []}
