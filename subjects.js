// Subject-specific data: formulas, topics, examples
const SubjectData = {
  mathematics: {
    name: 'Mathematics',
    icon: '∑',
    color: '#6c63ff',
    topics: ['Calculus', 'Linear Algebra', 'Differential Equations', 'Probability', 'Statistics', 'Complex Numbers', 'Fourier Series', 'Laplace Transform', 'Numerical Methods'],
    formulas: [
      { category: 'Calculus', items: [
        { name: 'Derivative of xⁿ', formula: '\\frac{d}{dx}(x^n) = nx^{n-1}' },
        { name: 'Chain Rule', formula: '\\frac{d}{dx}[f(g(x))] = f\'(g(x)) \\cdot g\'(x)' },
        { name: 'Integration by Parts', formula: '\\int u\\,dv = uv - \\int v\\,du' },
        { name: "Taylor's Series", formula: 'f(x) = \\sum_{n=0}^{\\infty} \\frac{f^{(n)}(a)}{n!}(x-a)^n' },
        { name: "L'Hôpital's Rule", formula: '\\lim_{x \\to a} \\frac{f(x)}{g(x)} = \\lim_{x \\to a} \\frac{f\'(x)}{g\'(x)}' },
        { name: 'Fundamental Theorem', formula: '\\int_a^b f(x)dx = F(b) - F(a)' },
      ]},
      { category: 'Linear Algebra', items: [
        { name: 'Determinant 2×2', formula: '\\det(A) = ad - bc' },
        { name: 'Eigenvalue', formula: 'Av = \\lambda v \\Rightarrow \\det(A - \\lambda I) = 0' },
        { name: 'Dot Product', formula: '\\vec{a} \\cdot \\vec{b} = |a||b|\\cos\\theta' },
        { name: 'Cross Product Magnitude', formula: '|\\vec{a} \\times \\vec{b}| = |a||b|\\sin\\theta' },
        { name: 'Rank-Nullity Theorem', formula: 'rank(A) + nullity(A) = n' },
      ]},
      { category: 'Differential Equations', items: [
        { name: 'First Order Linear ODE', formula: '\\frac{dy}{dx} + P(x)y = Q(x)' },
        { name: 'Integrating Factor', formula: 'IF = e^{\\int P(x)dx}' },
        { name: 'Characteristic Equation', formula: 'ar^2 + br + c = 0' },
        { name: 'Laplace Transform', formula: '\\mathcal{L}\\{f(t)\\} = \\int_0^{\\infty} e^{-st}f(t)dt' },
      ]},
      { category: 'Probability', items: [
        { name: "Bayes' Theorem", formula: 'P(A|B) = \\frac{P(B|A)P(A)}{P(B)}' },
        { name: 'Normal Distribution', formula: 'f(x) = \\frac{1}{\\sigma\\sqrt{2\\pi}}e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}' },
        { name: 'Expected Value', formula: 'E[X] = \\sum x_i P(x_i)' },
        { name: 'Variance', formula: 'Var(X) = E[X^2] - (E[X])^2' },
      ]}
    ],
    exampleQuestions: [
      'Solve the differential equation dy/dx + 2y = e^x',
      'Find the eigenvalues of matrix [[2,1],[1,2]]',
      'Evaluate the integral of x²e^x dx',
      'Prove that the series Σ(1/n²) converges',
    ]
  },

  physics: {
    name: 'Physics',
    icon: '⚛',
    color: '#ff6b6b',
    topics: ['Mechanics', 'Thermodynamics', 'Electromagnetism', 'Optics', 'Modern Physics', 'Waves', 'Fluid Mechanics'],
    formulas: [
      { category: 'Mechanics', items: [
        { name: "Newton's Second Law", formula: 'F = ma' },
        { name: 'Kinematic Equation', formula: 'v^2 = u^2 + 2as' },
        { name: 'Work-Energy Theorem', formula: 'W = \\Delta KE = \\frac{1}{2}mv^2 - \\frac{1}{2}mu^2' },
        { name: 'Gravitational Force', formula: 'F = \\frac{Gm_1m_2}{r^2}' },
        { name: 'Angular Momentum', formula: 'L = I\\omega = mvr' },
        { name: 'Torque', formula: '\\tau = r \\times F = I\\alpha' },
      ]},
      { category: 'Thermodynamics', items: [
        { name: 'First Law', formula: '\\Delta U = Q - W' },
        { name: 'Ideal Gas Law', formula: 'PV = nRT' },
        { name: 'Entropy Change', formula: '\\Delta S = \\int \\frac{dQ}{T}' },
        { name: 'Carnot Efficiency', formula: '\\eta = 1 - \\frac{T_L}{T_H}' },
      ]},
      { category: 'Electromagnetism', items: [
        { name: "Coulomb's Law", formula: 'F = \\frac{kq_1q_2}{r^2}' },
        { name: "Ohm's Law", formula: 'V = IR' },
        { name: "Faraday's Law", formula: '\\mathcal{E} = -\\frac{d\\Phi_B}{dt}' },
        { name: 'Maxwell Equation (Gauss)', formula: '\\nabla \\cdot \\vec{E} = \\frac{\\rho}{\\epsilon_0}' },
        { name: 'Energy in Capacitor', formula: 'U = \\frac{1}{2}CV^2' },
      ]},
      { category: 'Modern Physics', items: [
        { name: "de Broglie Wavelength", formula: '\\lambda = \\frac{h}{mv}' },
        { name: "Heisenberg Uncertainty", formula: '\\Delta x \\cdot \\Delta p \\geq \\frac{\\hbar}{2}' },
        { name: "Mass-Energy Equivalence", formula: 'E = mc^2' },
        { name: 'Photoelectric Effect', formula: 'E = h\\nu = \\phi + KE_{max}' },
      ]}
    ],
    exampleQuestions: [
      'A ball is thrown at 30° with 20 m/s. Find max height.',
      'Calculate the electric field due to a point charge',
      'Explain entropy with example',
      'What is the de Broglie wavelength of an electron at 1 keV?',
    ]
  },

  mechanics: {
    name: 'Engineering Mechanics',
    icon: '⚙',
    color: '#ffd93d',
    topics: ['Statics', 'Dynamics', 'Strength of Materials', 'Fluid Mechanics', 'Vibrations'],
    formulas: [
      { category: 'Statics', items: [
        { name: 'Equilibrium', formula: '\\sum F = 0, \\quad \\sum M = 0' },
        { name: 'Moment of Force', formula: 'M = F \\times d' },
        { name: 'Centroid (composite)', formula: '\\bar{x} = \\frac{\\sum A_i x_i}{\\sum A_i}' },
        { name: 'Moment of Inertia', formula: 'I = \\int r^2 \\, dA' },
        { name: 'Parallel Axis Theorem', formula: 'I = I_G + Ad^2' },
      ]},
      { category: 'Strength of Materials', items: [
        { name: "Hooke's Law", formula: '\\sigma = E\\epsilon' },
        { name: 'Bending Stress', formula: '\\sigma = \\frac{My}{I}' },
        { name: 'Shear Stress', formula: '\\tau = \\frac{VQ}{Ib}' },
        { name: 'Torsion Formula', formula: '\\frac{T}{J} = \\frac{\\tau}{r} = \\frac{G\\phi}{L}' },
        { name: 'Poisson\'s Ratio', formula: '\\nu = -\\frac{\\epsilon_{lateral}}{\\epsilon_{axial}}' },
      ]},
      { category: 'Dynamics', items: [
        { name: "D'Alembert's Principle", formula: '\\sum F - ma = 0' },
        { name: 'Impulse-Momentum', formula: 'J = \\Delta p = m(v_2 - v_1)' },
        { name: 'Coefficient of Restitution', formula: 'e = \\frac{v_2 - v_1}{u_1 - u_2}' },
      ]}
    ],
    exampleQuestions: [
      'Find reactions at supports for a simply supported beam with UDL',
      'Calculate principal stresses using Mohr\'s circle',
      'Find the moment of inertia of a composite section',
      'Analyze a truss using method of joints',
    ]
  },

  electronics: {
    name: 'Electronics',
    icon: '⚡',
    color: '#4ecdc4',
    topics: ['Circuit Analysis', 'Digital Electronics', 'Signals & Systems', 'Control Systems', 'Microprocessors', 'Communication Systems'],
    formulas: [
      { category: 'Circuit Analysis', items: [
        { name: "Kirchhoff's Voltage Law", formula: '\\sum V = 0 \\text{ (closed loop)}' },
        { name: "Kirchhoff's Current Law", formula: '\\sum I_{in} = \\sum I_{out}' },
        { name: 'RC Time Constant', formula: '\\tau = RC' },
        { name: 'Impedance', formula: 'Z = R + jX = |Z|\\angle\\phi' },
        { name: 'Power Factor', formula: 'PF = \\cos\\phi = \\frac{P}{S}' },
        { name: 'Resonance Frequency', formula: 'f_r = \\frac{1}{2\\pi\\sqrt{LC}}' },
      ]},
      { category: 'Signals & Systems', items: [
        { name: 'Fourier Transform', formula: 'X(f) = \\int_{-\\infty}^{\\infty} x(t)e^{-j2\\pi ft}dt' },
        { name: 'Convolution', formula: 'y(t) = x(t) * h(t) = \\int_{-\\infty}^{\\infty} x(\\tau)h(t-\\tau)d\\tau' },
        { name: 'Z-Transform', formula: 'X(z) = \\sum_{n=-\\infty}^{\\infty} x[n]z^{-n}' },
        { name: 'Sampling Theorem', formula: 'f_s \\geq 2f_{max}' },
      ]},
      { category: 'Digital Electronics', items: [
        { name: 'Boolean AND', formula: 'A \\cdot B' },
        { name: 'Boolean OR', formula: 'A + B' },
        { name: 'De Morgan\'s Law 1', formula: '\\overline{A+B} = \\bar{A}\\cdot\\bar{B}' },
        { name: 'De Morgan\'s Law 2', formula: '\\overline{A\\cdot B} = \\bar{A}+\\bar{B}' },
      ]}
    ],
    exampleQuestions: [
      'Find the transfer function of an RC low-pass filter',
      'Design a 3-bit binary counter',
      'Simplify Boolean expression using K-map',
      'Find the Fourier series of a square wave',
    ]
  },

  chemistry: {
    name: 'Chemistry',
    icon: '🧪',
    color: '#a29bfe',
    topics: ['Atomic Structure', 'Chemical Bonding', 'Thermochemistry', 'Electrochemistry', 'Polymers', 'Corrosion'],
    formulas: [
      { category: 'Thermochemistry', items: [
        { name: "Hess's Law", formula: '\\Delta H_{rxn} = \\sum \\Delta H_f(products) - \\sum \\Delta H_f(reactants)' },
        { name: 'Gibbs Free Energy', formula: '\\Delta G = \\Delta H - T\\Delta S' },
        { name: 'Equilibrium Constant', formula: 'K_c = \\frac{[C]^c[D]^d}{[A]^a[B]^b}' },
      ]},
      { category: 'Electrochemistry', items: [
        { name: 'Nernst Equation', formula: 'E = E^0 - \\frac{RT}{nF}\\ln Q' },
        { name: "Faraday's Law", formula: 'm = \\frac{MIt}{nF}' },
        { name: 'Cell EMF', formula: 'E_{cell} = E_{cathode} - E_{anode}' },
      ]}
    ],
    exampleQuestions: [
      'Calculate the pH of 0.1M HCl solution',
      'Explain the electrochemical series',
      'What is galvanic corrosion and how to prevent it?',
      'Calculate lattice energy using Born-Haber cycle',
    ]
  },

  programming: {
    name: 'Programming',
    icon: '</> ',
    color: '#fd79a8',
    topics: ['Data Structures', 'Algorithms', 'C/C++', 'Python', 'Java', 'Databases', 'Operating Systems', 'Computer Networks'],
    formulas: [
      { category: 'Algorithm Complexity', items: [
        { name: 'Binary Search', formula: 'O(\\log n)' },
        { name: 'Bubble Sort', formula: 'O(n^2)' },
        { name: 'Merge Sort', formula: 'O(n \\log n)' },
        { name: 'BFS/DFS', formula: 'O(V + E)' },
        { name: "Dijkstra's Algorithm", formula: 'O((V + E)\\log V)' },
      ]},
      { category: 'Recurrences', items: [
        { name: 'Master Theorem', formula: 'T(n) = aT(n/b) + f(n)' },
        { name: 'Fibonacci', formula: 'T(n) = T(n-1) + T(n-2), \\; O(2^n)' },
      ]}
    ],
    exampleQuestions: [
      'Explain binary search tree with insertion and deletion',
      'Write a dynamic programming solution for 0/1 knapsack',
      'Explain OS scheduling algorithms with examples',
      'What is the difference between TCP and UDP?',
    ]
  }
};

// Unit conversion data
const UnitData = {
  length: {
    name: 'Length',
    units: {
      'm': 1, 'km': 1000, 'cm': 0.01, 'mm': 0.001,
      'ft': 0.3048, 'in': 0.0254, 'yd': 0.9144, 'mi': 1609.344,
      'nm': 1e-9, 'μm': 1e-6
    }
  },
  mass: {
    name: 'Mass',
    units: {
      'kg': 1, 'g': 0.001, 'mg': 1e-6, 'lb': 0.453592,
      'oz': 0.0283495, 'ton': 1000, 'slug': 14.5939
    }
  },
  time: {
    name: 'Time',
    units: {
      's': 1, 'ms': 0.001, 'min': 60, 'h': 3600,
      'day': 86400, 'week': 604800, 'μs': 1e-6, 'ns': 1e-9
    }
  },
  temperature: {
    name: 'Temperature',
    units: { 'K': 'kelvin', '°C': 'celsius', '°F': 'fahrenheit', '°R': 'rankine' },
    special: true
  },
  force: {
    name: 'Force',
    units: {
      'N': 1, 'kN': 1000, 'MN': 1e6, 'lbf': 4.44822,
      'kgf': 9.80665, 'dyn': 1e-5
    }
  },
  pressure: {
    name: 'Pressure',
    units: {
      'Pa': 1, 'kPa': 1000, 'MPa': 1e6, 'bar': 1e5,
      'atm': 101325, 'psi': 6894.76, 'mmHg': 133.322, 'torr': 133.322
    }
  },
  energy: {
    name: 'Energy',
    units: {
      'J': 1, 'kJ': 1000, 'MJ': 1e6, 'cal': 4.184,
      'kcal': 4184, 'eV': 1.602e-19, 'Wh': 3600, 'kWh': 3.6e6, 'BTU': 1055.06
    }
  },
  power: {
    name: 'Power',
    units: {
      'W': 1, 'kW': 1000, 'MW': 1e6, 'hp': 745.7,
      'BTU/h': 0.29307, 'cal/s': 4.184
    }
  },
  speed: {
    name: 'Speed',
    units: {
      'm/s': 1, 'km/h': 0.27778, 'mph': 0.44704,
      'ft/s': 0.3048, 'knot': 0.514444, 'mach': 343
    }
  },
  angle: {
    name: 'Angle',
    units: {
      'rad': 1, 'deg': Math.PI/180, 'grad': Math.PI/200,
      'rev': 2*Math.PI, 'arcmin': Math.PI/10800, 'arcsec': Math.PI/648000
    }
  }
};

// Periodic Table data (first 36 elements)
const PeriodicTableData = [
  { n: 1, sym: 'H', name: 'Hydrogen', mass: 1.008, cat: 'nonmetal', group: 1, period: 1 },
  { n: 2, sym: 'He', name: 'Helium', mass: 4.003, cat: 'noble-gas', group: 18, period: 1 },
  { n: 3, sym: 'Li', name: 'Lithium', mass: 6.941, cat: 'alkali-metal', group: 1, period: 2 },
  { n: 4, sym: 'Be', name: 'Beryllium', mass: 9.012, cat: 'alkaline-earth', group: 2, period: 2 },
  { n: 5, sym: 'B', name: 'Boron', mass: 10.811, cat: 'metalloid', group: 13, period: 2 },
  { n: 6, sym: 'C', name: 'Carbon', mass: 12.011, cat: 'nonmetal', group: 14, period: 2 },
  { n: 7, sym: 'N', name: 'Nitrogen', mass: 14.007, cat: 'nonmetal', group: 15, period: 2 },
  { n: 8, sym: 'O', name: 'Oxygen', mass: 15.999, cat: 'nonmetal', group: 16, period: 2 },
  { n: 9, sym: 'F', name: 'Fluorine', mass: 18.998, cat: 'halogen', group: 17, period: 2 },
  { n: 10, sym: 'Ne', name: 'Neon', mass: 20.180, cat: 'noble-gas', group: 18, period: 2 },
  { n: 11, sym: 'Na', name: 'Sodium', mass: 22.990, cat: 'alkali-metal', group: 1, period: 3 },
  { n: 12, sym: 'Mg', name: 'Magnesium', mass: 24.305, cat: 'alkaline-earth', group: 2, period: 3 },
  { n: 13, sym: 'Al', name: 'Aluminum', mass: 26.982, cat: 'post-transition', group: 13, period: 3 },
  { n: 14, sym: 'Si', name: 'Silicon', mass: 28.086, cat: 'metalloid', group: 14, period: 3 },
  { n: 15, sym: 'P', name: 'Phosphorus', mass: 30.974, cat: 'nonmetal', group: 15, period: 3 },
  { n: 16, sym: 'S', name: 'Sulfur', mass: 32.065, cat: 'nonmetal', group: 16, period: 3 },
  { n: 17, sym: 'Cl', name: 'Chlorine', mass: 35.453, cat: 'halogen', group: 17, period: 3 },
  { n: 18, sym: 'Ar', name: 'Argon', mass: 39.948, cat: 'noble-gas', group: 18, period: 3 },
  { n: 19, sym: 'K', name: 'Potassium', mass: 39.098, cat: 'alkali-metal', group: 1, period: 4 },
  { n: 20, sym: 'Ca', name: 'Calcium', mass: 40.078, cat: 'alkaline-earth', group: 2, period: 4 },
  { n: 21, sym: 'Sc', name: 'Scandium', mass: 44.956, cat: 'transition-metal', group: 3, period: 4 },
  { n: 22, sym: 'Ti', name: 'Titanium', mass: 47.867, cat: 'transition-metal', group: 4, period: 4 },
  { n: 23, sym: 'V', name: 'Vanadium', mass: 50.942, cat: 'transition-metal', group: 5, period: 4 },
  { n: 24, sym: 'Cr', name: 'Chromium', mass: 51.996, cat: 'transition-metal', group: 6, period: 4 },
  { n: 25, sym: 'Mn', name: 'Manganese', mass: 54.938, cat: 'transition-metal', group: 7, period: 4 },
  { n: 26, sym: 'Fe', name: 'Iron', mass: 55.845, cat: 'transition-metal', group: 8, period: 4 },
  { n: 27, sym: 'Co', name: 'Cobalt', mass: 58.933, cat: 'transition-metal', group: 9, period: 4 },
  { n: 28, sym: 'Ni', name: 'Nickel', mass: 58.693, cat: 'transition-metal', group: 10, period: 4 },
  { n: 29, sym: 'Cu', name: 'Copper', mass: 63.546, cat: 'transition-metal', group: 11, period: 4 },
  { n: 30, sym: 'Zn', name: 'Zinc', mass: 65.38, cat: 'transition-metal', group: 12, period: 4 },
  { n: 31, sym: 'Ga', name: 'Gallium', mass: 69.723, cat: 'post-transition', group: 13, period: 4 },
  { n: 32, sym: 'Ge', name: 'Germanium', mass: 72.630, cat: 'metalloid', group: 14, period: 4 },
  { n: 33, sym: 'As', name: 'Arsenic', mass: 74.922, cat: 'metalloid', group: 15, period: 4 },
  { n: 34, sym: 'Se', name: 'Selenium', mass: 78.971, cat: 'nonmetal', group: 16, period: 4 },
  { n: 35, sym: 'Br', name: 'Bromine', mass: 79.904, cat: 'halogen', group: 17, period: 4 },
  { n: 36, sym: 'Kr', name: 'Krypton', mass: 83.798, cat: 'noble-gas', group: 18, period: 4 },
];
