
import re

def check_syntax(filename):
    with open(filename, 'r') as f:
        lines = f.readlines()

    stack = []
    
    # Regex for strings and comments
    # This is a simplified regex and might not catch everything perfectly
    # but should be good enough for this task.
    # We remove strings and comments before counting braces.
    
    content = "".join(lines)
    
    # Remove single line comments // ...
    # content = re.sub(r'//.*', '', content) # This breaks URLs
    
    # Remove multi-line comments /* ... */
    # content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
    
    # Remove multi-line comments /* ... */
    content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
    
    # Remove strings "..." and '...' and `...`
    # We need to be careful about escaped quotes
    # This is hard with regex alone.
    
    # Let's do a char by char scan
    
    in_string = False
    string_char = ''
    in_comment = False # /* ... */
    in_line_comment = False # // ...
    
    line_num = 1
    col_num = 0
    
    i = 0
    while i < len(content):
        char = content[i]
        
        if char == '\n':
            line_num += 1
            col_num = 0
            in_line_comment = False
            i += 1
            continue
            
        col_num += 1
        
        if in_line_comment:
            i += 1
            continue
            
        if in_comment:
            if char == '*' and i+1 < len(content) and content[i+1] == '/':
                in_comment = False
                i += 2
                col_num += 1
            else:
                i += 1
            continue
            
        if in_string:
            if char == '\\':
                i += 2 # Skip escaped char
                col_num += 1
            elif char == string_char:
                in_string = False
                i += 1
            else:
                i += 1
            continue
            
        # Check for start of comments
        if char == '/' and i+1 < len(content):
            if content[i+1] == '/':
                in_line_comment = True
                i += 2
                col_num += 1
                continue
            elif content[i+1] == '*':
                in_comment = True
                i += 2
                col_num += 1
                continue
                
        # Check for start of strings
        if char in ["'", '"', '`']:
            in_string = True
            string_char = char
            i += 1
            continue
            
        # Check braces
        if char in ['{', '(', '[']:
            stack.append((char, line_num, col_num))
        elif char in ['}', ')', ']']:
            if not stack:
                print(f"Error: Unexpected '{char}' at line {line_num}:{col_num}")
                return
            
            last, last_line, last_col = stack.pop()
            expected = {'{': '}', '(': ')', '[': ']'}
            if expected[last] != char:
                print(f"Error: Mismatched '{char}' at line {line_num}:{col_num}. Expected closing for '{last}' from line {last_line}:{last_col}")
                return
                
        i += 1
        
    if stack:
        last, last_line, last_col = stack[-1]
        print(f"Error: Unclosed '{last}' from line {last_line}:{last_col}")
    else:
        print("Syntax OK")

check_syntax('c:/Users/jnybr/OneDrive/Desktop/CTemp/chronicle/src/components/Icons.jsx')
