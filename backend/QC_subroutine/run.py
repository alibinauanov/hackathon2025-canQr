import os
import re
import pandas as pd
import matplotlib.pyplot as plt
import json
import numpy as np

# Step 1: Read the file
with open('/Users/gb/Projects/hackathon2025-canQr/backend/QC_subroutine/output.txt', 'r') as f:
    data = f.read()

# Step 2: Extract relevant sections
steps = re.findall(r'--- STEP (\d+): (.*?) = ([0-9.]+) ---\n(.*?)\n(?===|---|\Z)', data, re.DOTALL)

# Step 3: Parse data into a list
records = []
for step in steps:
    step_number = int(step[0])
    parameter = step[1]
    value = float(step[2])
    block = step[3]
    
    cancer_binding = re.search(r'Cancer binding: ([\-0-9.]+)', block)
    healthy_binding = re.search(r'Average healthy binding: ([\-0-9.]+)', block)
    selectivity = re.search(r'Selectivity score: ([\-0-9.]+)', block)
    
    if cancer_binding and healthy_binding and selectivity:
        records.append({
            'Step': step_number,
            'Parameter': parameter,
            'Value': value,
            'Cancer_Binding': float(cancer_binding.group(1)),
            'Healthy_Binding': float(healthy_binding.group(1)),
            'Selectivity_Score': float(selectivity.group(1))
        })

# Step 4: Save to JSON
os.makedirs('output_images', exist_ok=True)
with open('output_images/results.json', 'w') as f_json:
    json.dump(records, f_json, indent=4)

# Step 5: Plot the graphs
df = pd.DataFrame(records)

plt.figure()
plt.plot(df['Step'], df['Cancer_Binding'], marker='o', label='Cancer Binding')
plt.plot(df['Step'], df['Healthy_Binding'], marker='x', label='Healthy Binding')
plt.xlabel('Step')
plt.ylabel('Binding Energy')
plt.title('Binding Energies per Step')
plt.legend()
plt.savefig('output_images/binding_energies_by_step.png')

plt.figure()
plt.plot(df['Step'], df['Selectivity_Score'], marker='s', label='Selectivity Score', color='green')
plt.xlabel('Step')
plt.ylabel('Selectivity Score')
plt.title('Selectivity Score per Step')
plt.legend()
plt.savefig('output_images/selectivity_score_by_step.png')

# Step 6: Plot binding energy comparison
structures = ['DNA-GG (Cancer)', 'Hair Follicle (Healthy)', 'Bone Marrow (Healthy)', 'Kidney (Healthy)']
cancer_binding = [20.589013]
healthy_binding = [20.321090, 20.568839, 20.583128]

x = np.arange(len(structures))
width = 0.35

fig, ax = plt.subplots(figsize=(10, 6))
ax.bar(x[0], cancer_binding[0], width, label='Cancer')
ax.bar(x[1:], healthy_binding, width, label='Healthy')
ax.set_ylabel('Binding Energy')
ax.set_title('Binding Energy by Molecular Structure')
ax.set_xticks(x)
ax.set_xticklabels(structures, rotation=30, ha='right')
ax.legend()
plt.tight_layout()
plt.savefig('output_images/binding_energy_comparison.png')

# Step 7: Plot binding energy difference
binding_diff = [cancer_binding[0] - h for h in healthy_binding]

fig, ax = plt.subplots(figsize=(8, 5))
ax.bar(structures[1:], binding_diff, color='orange')
ax.axhline(0, color='gray', linewidth=0.8)
ax.set_ylabel('Binding Energy Difference (Cancer - Healthy)')
ax.set_title('Selectivity of Molecule (higher = better)')
plt.xticks(rotation=30, ha='right')
plt.tight_layout()
plt.savefig('output_images/binding_energy_difference.png')

print(json.dumps({"status": "ok", "message": "Plots and JSON generated successfully"}))