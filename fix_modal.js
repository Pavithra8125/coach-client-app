const fs = require('fs');

const path = 'client/src/components/MealPlanCard.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Wrap the return statement with a fragment
content = content.replace(
  '  return (\n    <div className="rounded-2xl border border-white/40 bg-white/30 p-4 backdrop-blur-xl">',
  '  return (\n    <>\n      <div className="rounded-2xl border border-white/40 bg-white/30 p-4 backdrop-blur-xl">'
);

// 2. Close the div before `{open &&`
content = content.replace(
  '      {open && (',
  '      </div>\n\n      {open && ('
);

// 3. Update the modal inner container classes (make it solid/opaque)
content = content.replace(
  '          <div className="w-full max-w-md rounded-2xl border border-white/40 bg-white/30 p-5 backdrop-blur-xl">',
  '          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">'
);

// 4. Update the heading text color inside the modal (from text-slate-700 to text-slate-900)
content = content.replace(
  '<h3 className="text-lg font-semibold text-slate-700">{mealPlan ? \'Edit meal plan\' : \'Set meal plan\'}</h3>',
  '<h3 className="text-lg font-semibold text-slate-900">{mealPlan ? \'Edit meal plan\' : \'Set meal plan\'}</h3>'
);

// 5. Close the fragment at the very end
content = content.replace(
  '    </div>\n  );\n}',
  '    </>\n  );\n}'
);

fs.writeFileSync(path, content);
console.log('Fixed MealPlanCard.jsx modal layout');
