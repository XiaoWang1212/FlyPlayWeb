import re
import json
import requests
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Dict, List, Optional, Tuple

from ortools.constraint_solver import pywrapcp, routing_enums_pb2
            
#小工具

weekDay_ZH = ["星期一","星期二","星期三","星期四","星期五","星期六","星期日"]        

def min_to_hm(hm: str) -> int:
    h, m = hm.strip().split(":")
    return int(h)*60 + int(m)

def min_to_hm(min: int) -> str:
    h = ( m//60 ) % 24
    mm = m % 60
    return f"{h:02d}:{mm:02d}"

def clamp_window(win: Tuple[int, int], day_start: int, day_end: int) -> Tuple[int, int]:
    a, b = win
    a = max(a, day_start)
    b = min(b, day_end)
    return (a, b)

def parse_duration_to_min(s: str) -> int:
    #20 min and 1hr 20 min
    if not s:
        return 0
    s = s.strip()
    total = 0
    
    hour = re.search(r"(\d+)\s*小時", s)
    minute = re.search(r"(\d+)\s*分鐘", s)
    
    if hour:
        total += int( hour.group(1) ) * 60
    if minute:
        total += int( minute.group(1) )
        
    if total == 0:
        nums = re.findall(r"\d+", s)
        if nums:
            total = int( nums[0] )
    return total

def parse_opening_hours_for_date(opening_hours: List[str], d: date) -> Optional[Tuple[int, int]]:
    if not opening_hours:
        return None
    
    key = weekDay_ZH[ d.weekday() ]
    line = None
    for x in opening_hours:
        if x.startswith(key):
            line = x
            break
    if not line:
        return None
    
    if "休息" in line or "Closed" in line:
        return None
    
    #24小
    if "24" in line and ("小時" in line or "hours" in line.lower()):
        return (0, 24 * 60 )
    
    m = re.search(r"(\d{2}:\d{2})\s*[--]\s*(\d{2}:\d{2})", line)
    if not m:
        return None
    
    open_min = hm_to_min(m.group(1))
    close_min = hm_to_min(m.group(2))
    
    if close_min < open_min:
        close_min += 24*60
        
    return(open_min, close_min)
