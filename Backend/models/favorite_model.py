"""
Favorite Model - 收藏地點數據模型
"""
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Float
from sqlalchemy.sql import func
from models.database import Base

class Favorite(Base):
    __tablename__ = 'favorites'
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    place_id = Column(String(255), nullable=False)  # Google Maps Place ID
    place_name = Column(String(255), nullable=False)
    place_address = Column(Text, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    category = Column(String(100), nullable=True)  # 景點類別
    notes = Column(Text, nullable=True)  # 用戶備註
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def to_dict(self):
        """轉換為字典格式"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'place_id': self.place_id,
            'place_name': self.place_name,
            'place_address': self.place_address,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'category': self.category,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f"<Favorite(id={self.id}, place_name='{self.place_name}')>"
