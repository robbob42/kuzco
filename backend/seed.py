from backend.database import SessionLocal, engine, Base
from backend import models

def seed():
    # 1. Create Tables (Idempotent)
    print("Checking database tables...")
    Base.metadata.create_all(bind=engine)

    # 2. Define Initial Users
    # MODIFY THESE EMAILS to match your real Cloudflare emails
    initial_users = [
        {"email": "robbob42@gmail.com", "display_name": "Rob", "is_active": True},
        {"email": "shane.tory@gmail.com", "display_name": "Shane", "is_active": True},
        {"email": "mike.nelson9@gmail.com", "display_name": "Mike", "is_active": True},
        {"email": "kronk@dev.local", "display_name": "Kronk (Dev)", "is_active": True},
    ]

    db = SessionLocal()
    
    print("Seeding users...")
    for user_data in initial_users:
        user = db.query(models.User).filter(models.User.email == user_data["email"]).first()
        if not user:
            print(f"  + Creating: {user_data['display_name']} ({user_data['email']})")
            new_user = models.User(**user_data)
            db.add(new_user)
        else:
            print(f"  . Exists: {user_data['display_name']}")
    
    db.commit()
    db.close()
    print("Seeding complete.")

if __name__ == "__main__":
    seed()