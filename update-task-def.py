import json
import sys

# Read task definition
try:
    with open('current-task-def-full.json', 'r', encoding='utf-8-sig') as f:
        data = json.load(f)
except:
    with open('current-task-def-full.json', 'r', encoding='utf-16') as f:
        data = json.load(f)

# Update environment variables
td = data['taskDefinition']
env = td['containerDefinitions'][0]['environment']

for e in env:
    if e['name'] == 'SUPABASE_URL':
        e['value'] = 'https://mgjlnmlhwuqspctanaik.supabase.co'
        print("Updated SUPABASE_URL")
    elif e['name'] == 'SUPABASE_SERVICE_ROLE_KEY':
        e['value'] = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1namxubWxod3Vxc3BjdGFuYWlrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQxNDMwNSwiZXhwIjoyMDcyOTkwMzA1fQ.AgWM1MZCPGQHgpZ4749KtgAOOGQZoI7wFvBqp_2p8Ng'
        print("Updated SUPABASE_SERVICE_ROLE_KEY")
    elif e['name'] == 'SUPABASE_JWT_SECRET':
        e['value'] = 'b5xpWCI1kSA9+zuP39rNJ3RIJiwHa86gGsL6mBcUpl6u6VxFaTowQcHoNpJhrYTacxAdsHBosS+k88xHlNdXyQ=='
        print("Updated SUPABASE_JWT_SECRET")

# Remove fields that shouldn't be in new task definition
for key in ['taskDefinitionArn', 'revision', 'status', 'requiresAttributes', 'compatibilities', 'registeredAt', 'registeredBy']:
    if key in td:
        del td[key]

# Save updated task definition (AWS CLI expects taskDefinition directly, not wrapped)
with open('final-task-def.json', 'w', encoding='utf-8') as f:
    json.dump(td, f, indent=2)

print("\nTask definition updated successfully!")
print("File saved as: final-task-def.json")

