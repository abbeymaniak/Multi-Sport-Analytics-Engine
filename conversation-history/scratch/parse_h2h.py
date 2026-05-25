import os
import json
import re
from bs4 import BeautifulSoup

def main():
    # Read the local md/HTML content fetched previously
    file_path = "/Users/primastech/.gemini/antigravity-ide/brain/108d14bd-afd1-4495-83f6-f3babe04f85b/.system_generated/steps/14/content.md"
    
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Extract HTML content
    # Since the tool converted html to markdown, let's see if we can parse it as html
    soup = BeautifulSoup(content, "html.parser")
    
    # Let's find all divs with class "match-card-second"
    cards = soup.find_all("div", class_="match-card-second")
    print(f"Found {len(cards)} match cards.")
    
    parsed_matches = []
    
    for card in cards:
        # Get header
        header_div = card.find("div", class_="match-header")
        if not header_div:
            continue
            
        time_span = header_div.find("span", class_="match-time")
        title_span = header_div.find("span", class_="match-title")
        
        time_str = time_span.get_text(strip=True) if time_span else ""
        title_str = title_span.get_text(strip=True) if title_span else ""
        
        # Get subheader
        subheader_div = card.find("div", class_="match-subheader")
        subheader_str = subheader_div.get_text(strip=True) if subheader_div else ""
        
        # Get history lines
        history_div = card.find("div", class_="match-history")
        history_lines = []
        marked_count = 0
        
        if history_div:
            # All lines inside history
            lines = history_div.find_all("div", class_=lambda x: x and "match-line" in x)
            for line in lines:
                is_marked = "is_marked_row" in line.get("class", [])
                line_text = line.get_text(strip=True)
                
                history_lines.append({
                    "text": line_text,
                    "is_marked": is_marked
                })
                if is_marked:
                    marked_count += 1
        
        parsed_matches.append({
            "time": time_str,
            "title": title_str,
            "subheader": subheader_str,
            "history": history_lines,
            "marked_count": marked_count
        })
    
    # Filter matches where marked_count > 2
    filtered_matches = [m for m in parsed_matches if m["marked_count"] > 2]
    print(f"Filtered {len(filtered_matches)} matches with > 2 marked rows.")
    
    for idx, match in enumerate(filtered_matches[:5]):
        print(f"{idx+1}. {match['time']} - {match['title']} (Marked rows: {match['marked_count']})")
        for line in match["history"]:
            if line["is_marked"]:
                print(f"   [Marked] {line['text']}")
                
if __name__ == "__main__":
    main()
