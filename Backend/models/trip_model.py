"""
Trip Model - 旅行計劃數據模型
"""
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from models.database import Base

class Trip(Base):
    __tablename__ = 'trips'
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    title = Column(String(255), nullable=False)
    location = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    budget = Column(Float, nullable=True)
    status = Column(String(50), default='planning')  # planning, ongoing, completed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # 關聯
    # user = relationship("User", back_populates="trips")
    
    def to_dict(self):
        """轉換為字典格式"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'location': self.location,
            'description': self.description,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'budget': self.budget,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f"<Trip(id={self.id}, title='{self.title}', location='{self.location}')>"
