import os
import re

DIR = 'client/src/components'
FILES = [
    'ClientWorkouts.jsx', 'PlanCard.jsx', 'LogCard.jsx', 'LiftHistoryCard.jsx', 'DayModal.jsx',
    'ClientGamification.jsx', 'ClientDiet.jsx', 'MealPlanCard.jsx', 'FoodLogCard.jsx', 'WaterCard.jsx', 'SupplementCard.jsx',
    'ClientCheckins.jsx', 'CheckinModal.jsx', 'CoachLogCard.jsx', 'MeasurementList.jsx', 'MeasurementForm.jsx'
]

replacements = [
    (r'text-white', 'text-slate-900'),
    (r'text-slate-400', 'text-slate-500'),
    (r'text-slate-300', 'text-slate-600'),
    (r'text-slate-200', 'text-slate-700'),
    (r'bg-slate-800/90', 'bg-white border-slate-100'),
    (r'bg-slate-800/50', 'bg-white border-slate-100'),
    (r'bg-slate-800', 'bg-white'),
    (r'bg-slate-900/60', 'bg-slate-50'),
    (r'bg-slate-900', 'bg-white'),
    (r'bg-slate-950/80', 'bg-slate-100'),
    (r'bg-slate-950/50', 'bg-slate-50'),
    (r'bg-slate-700/80', 'bg-slate-100'),
    (r'bg-slate-700/50', 'bg-slate-100'),
    (r'bg-slate-700', 'bg-slate-100'),
    (r'border-slate-700/80', 'border-slate-200'),
    (r'border-slate-700', 'border-slate-200'),
    (r'border-slate-800/60', 'border-slate-200'),
    (r'border-slate-800', 'border-slate-100'),
    (r'bg-red-950/50', 'bg-red-50 border border-red-100'),
    (r'text-red-400', 'text-red-600'),
    (r'hover:text-red-400', 'hover:text-red-600'),
    (r'bg-gradient-to-b from-blue-500 to-blue-600', 'bg-indigo-600 text-white'),
    (r'hover:from-blue-400 hover:to-blue-500', 'hover:bg-indigo-500'),
    (r'hover:-translate-y-0.5 hover:bg-indigo-500', 'transition hover:bg-indigo-500'),
    (r'bg-gradient-to-b from-slate-600 to-slate-700', 'bg-white border border-slate-200 text-slate-700'),
    (r'hover:from-slate-500 hover:to-slate-600', 'hover:bg-slate-50'),
    (r'bg-emerald-600', 'bg-indigo-600 text-white'),
    (r'hover:bg-emerald-500', 'hover:bg-indigo-500'),
]

for f in FILES:
    path = os.path.join(DIR, f)
    if not os.path.exists(path):
        continue
    with open(path, 'r') as file:
        content = file.read()
    
    for old, new in replacements:
        content = re.sub(old, new, content)
        
    with open(path, 'w') as file:
        file.write(content)
        
print("Replacements done.")
