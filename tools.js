// Tools Module: Calculator, Converter, Graph, etc.

// ============ SCIENTIFIC CALCULATOR ============
const Calculator = {
  display: '',
  memory: 0,
  history: [],
  isRad: true,
  lastResult: null,

  init() {
    this.display = '0';
    this.updateDisplay();
  },

  updateDisplay() {
    const el = document.getElementById('calc-display');
    if (el) {
      el.textContent = this.display || '0';
      // Auto-size font
      const len = this.display.length;
      el.style.fontSize = len > 15 ? '1rem' : len > 10 ? '1.4rem' : '1.8rem';
    }
  },

  press(val) {
    if (this.display === '0' && !isNaN(val) && val !== '.') {
      this.display = String(val);
    } else if (this.display === 'Error') {
      this.display = String(val);
    } else {
      this.display += String(val);
    }
    this.updateDisplay();
  },

  clear() {
    this.display = '0';
    this.updateDisplay();
  },

  backspace() {
    if (this.display.length > 1) {
      this.display = this.display.slice(0, -1);
    } else {
      this.display = '0';
    }
    this.updateDisplay();
  },

  toggleSign() {
    if (this.display !== '0' && this.display !== 'Error') {
      if (this.display.startsWith('-')) {
        this.display = this.display.slice(1);
      } else {
        this.display = '-' + this.display;
      }
      this.updateDisplay();
    }
  },

  calculate() {
    try {
      let expr = this.display;
      // Replace math functions with JS equivalents
      expr = expr.replace(/sin\(/g, this.isRad ? 'Math.sin(' : 'Math.sin(Math.PI/180*');
      expr = expr.replace(/cos\(/g, this.isRad ? 'Math.cos(' : 'Math.cos(Math.PI/180*');
      expr = expr.replace(/tan\(/g, this.isRad ? 'Math.tan(' : 'Math.tan(Math.PI/180*');
      expr = expr.replace(/asin\(/g, 'Math.asin(');
      expr = expr.replace(/acos\(/g, 'Math.acos(');
      expr = expr.replace(/atan\(/g, 'Math.atan(');
      expr = expr.replace(/log\(/g, 'Math.log10(');
      expr = expr.replace(/ln\(/g, 'Math.log(');
      expr = expr.replace(/√\(/g, 'Math.sqrt(');
      expr = expr.replace(/√/g, 'Math.sqrt');
      expr = expr.replace(/π/g, 'Math.PI');
      expr = expr.replace(/e(?![a-zA-Z])/g, 'Math.E');
      expr = expr.replace(/\^/g, '**');
      expr = expr.replace(/×/g, '*');
      expr = expr.replace(/÷/g, '/');
      expr = expr.replace(/mod/g, '%');
      expr = expr.replace(/abs\(/g, 'Math.abs(');

      const result = Function('"use strict"; return (' + expr + ')')();
      
      if (!isFinite(result)) throw new Error('Division by zero');
      
      const formatted = parseFloat(result.toPrecision(12)).toString();
      this.history.push(`${this.display} = ${formatted}`);
      if (this.history.length > 20) this.history.shift();
      this.updateHistory();
      
      this.lastResult = result;
      this.display = formatted;
      this.updateDisplay();
    } catch (e) {
      this.display = 'Error';
      this.updateDisplay();
    }
  },

  scientificOp(op) {
    try {
      const val = parseFloat(this.display);
      let result;
      switch(op) {
        case 'sin': result = this.isRad ? Math.sin(val) : Math.sin(val * Math.PI / 180); break;
        case 'cos': result = this.isRad ? Math.cos(val) : Math.cos(val * Math.PI / 180); break;
        case 'tan': result = this.isRad ? Math.tan(val) : Math.tan(val * Math.PI / 180); break;
        case 'asin': result = Math.asin(val); if (!this.isRad) result *= 180/Math.PI; break;
        case 'acos': result = Math.acos(val); if (!this.isRad) result *= 180/Math.PI; break;
        case 'atan': result = Math.atan(val); if (!this.isRad) result *= 180/Math.PI; break;
        case 'log': result = Math.log10(val); break;
        case 'ln': result = Math.log(val); break;
        case 'sqrt': result = Math.sqrt(val); break;
        case 'cbrt': result = Math.cbrt(val); break;
        case 'sq': result = val * val; break;
        case 'cube': result = val * val * val; break;
        case 'inv': result = 1 / val; break;
        case 'fact': result = this.factorial(val); break;
        case 'exp': result = Math.exp(val); break;
        case 'abs': result = Math.abs(val); break;
        case 'pi': this.display = Math.PI.toString(); this.updateDisplay(); return;
        case 'e': this.display = Math.E.toString(); this.updateDisplay(); return;
        case 'rand': result = Math.random(); break;
        default: return;
      }
      if (!isFinite(result) || isNaN(result)) throw new Error('Math Error');
      this.history.push(`${op}(${val}) = ${parseFloat(result.toPrecision(10))}`);
      this.updateHistory();
      this.display = parseFloat(result.toPrecision(10)).toString();
      this.updateDisplay();
    } catch(e) {
      this.display = 'Error';
      this.updateDisplay();
    }
  },

  factorial(n) {
    if (n < 0 || !Number.isInteger(n)) throw new Error('Invalid input');
    if (n > 170) throw new Error('Too large');
    if (n <= 1) return 1;
    return n * this.factorial(n - 1);
  },

  memoryStore() {
    this.memory = parseFloat(this.display) || 0;
    this.showToast('Memory stored: ' + this.memory);
  },

  memoryRecall() {
    this.display = this.memory.toString();
    this.updateDisplay();
  },

  memoryClear() {
    this.memory = 0;
    this.showToast('Memory cleared');
  },

  memoryAdd() {
    this.memory += parseFloat(this.display) || 0;
    this.showToast('Memory: ' + this.memory);
  },

  toggleAngle() {
    this.isRad = !this.isRad;
    const btn = document.getElementById('angle-toggle');
    if (btn) btn.textContent = this.isRad ? 'RAD' : 'DEG';
    this.showToast(this.isRad ? 'Radians mode' : 'Degrees mode');
  },

  updateHistory() {
    const el = document.getElementById('calc-history');
    if (el) {
      el.innerHTML = this.history.slice(-5).reverse().map(h => `<div class="calc-history-item">${h}</div>`).join('');
    }
  },

  showToast(msg) {
    if (typeof showToast === 'function') showToast(msg);
  }
};

// ============ UNIT CONVERTER ============
const Converter = {
  convert(value, fromUnit, toUnit, category) {
    if (!value || isNaN(value)) return '';
    const val = parseFloat(value);
    const data = UnitData[category];
    if (!data) return '';

    if (data.special) {
      // Temperature conversion
      return this.convertTemperature(val, fromUnit, toUnit);
    }

    const fromFactor = data.units[fromUnit];
    const toFactor = data.units[toUnit];
    if (!fromFactor || !toFactor) return '';

    const result = (val * fromFactor) / toFactor;
    return this.formatResult(result);
  },

  convertTemperature(val, from, to) {
    let celsius;
    switch(from) {
      case '°C': celsius = val; break;
      case '°F': celsius = (val - 32) * 5/9; break;
      case 'K': celsius = val - 273.15; break;
      case '°R': celsius = (val - 491.67) * 5/9; break;
      default: return '';
    }
    switch(to) {
      case '°C': return this.formatResult(celsius);
      case '°F': return this.formatResult(celsius * 9/5 + 32);
      case 'K': return this.formatResult(celsius + 273.15);
      case '°R': return this.formatResult((celsius + 273.15) * 9/5);
      default: return '';
    }
  },

  formatResult(val) {
    if (Math.abs(val) >= 1e10 || (Math.abs(val) < 0.0001 && val !== 0)) {
      return val.toExponential(6);
    }
    return parseFloat(val.toPrecision(8)).toString();
  }
};

// ============ GRAPH PLOTTER ============
const GraphPlotter = {
  chart: null,

  plot(expression, xMin, xMax, steps = 200) {
    try {
      const xValues = [];
      const yValues = [];
      const step = (xMax - xMin) / steps;

      for (let i = 0; i <= steps; i++) {
        const x = xMin + i * step;
        xValues.push(x);
        try {
          let expr = expression
            .replace(/\^/g, '**')
            .replace(/sin\b/g, 'Math.sin')
            .replace(/cos\b/g, 'Math.cos')
            .replace(/tan\b/g, 'Math.tan')
            .replace(/sqrt\b/g, 'Math.sqrt')
            .replace(/abs\b/g, 'Math.abs')
            .replace(/log\b/g, 'Math.log10')
            .replace(/ln\b/g, 'Math.log')
            .replace(/exp\b/g, 'Math.exp')
            .replace(/π/g, 'Math.PI')
            .replace(/pi\b/g, 'Math.PI')
            .replace(/e\b/g, 'Math.E');

          const y = Function('x', `"use strict"; return ${expr}`)(x);
          yValues.push(isFinite(y) ? y : null);
        } catch(e) {
          yValues.push(null);
        }
      }

      const ctx = document.getElementById('graph-canvas');
      if (!ctx) return;

      if (this.chart) this.chart.destroy();

      const isDark = document.body.classList.contains('dark');
      const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
      const textColor = isDark ? '#e0e0e0' : '#333';

      this.chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: xValues.map(x => x.toFixed(2)),
          datasets: [{
            label: `y = ${expression}`,
            data: yValues,
            borderColor: '#6c63ff',
            backgroundColor: 'rgba(108,99,255,0.1)',
            borderWidth: 2,
            pointRadius: 0,
            fill: false,
            tension: 0,
            spanGaps: false
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { intersect: false, mode: 'index' },
          plugins: {
            legend: { labels: { color: textColor } },
            tooltip: {
              callbacks: {
                label: (ctx) => `y = ${ctx.raw?.toFixed(4) ?? 'undefined'}`
              }
            }
          },
          scales: {
            x: {
              grid: { color: gridColor },
              ticks: {
                color: textColor,
                maxTicksLimit: 10,
                callback: (val, idx) => {
                  const num = xValues[idx];
                  return num !== undefined ? num.toFixed(1) : '';
                }
              }
            },
            y: {
              grid: { color: gridColor },
              ticks: { color: textColor }
            }
          }
        }
      });
    } catch(e) {
      console.error('Graph error:', e);
    }
  }
};

// ============ LOGIC GATE SIMULATOR ============
const LogicGates = {
  inputs: { A: false, B: false },

  evaluate(gateType, a, b) {
    switch(gateType) {
      case 'AND': return a && b;
      case 'OR': return a || b;
      case 'NOT': return !a;
      case 'NAND': return !(a && b);
      case 'NOR': return !(a || b);
      case 'XOR': return a !== b;
      case 'XNOR': return a === b;
      default: return false;
    }
  },

  generateTruthTable(gateType) {
    const isUnary = gateType === 'NOT';
    const rows = [];
    if (isUnary) {
      rows.push({ A: false, out: this.evaluate(gateType, false, false) });
      rows.push({ A: true, out: this.evaluate(gateType, true, false) });
    } else {
      for (let a = 0; a <= 1; a++) {
        for (let b = 0; b <= 1; b++) {
          rows.push({ A: !!a, B: !!b, out: this.evaluate(gateType, !!a, !!b) });
        }
      }
    }
    return rows;
  }
};
