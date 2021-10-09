(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.LayoutEa = {}));
})(this, (function (exports) { 'use strict';

	class LayoutEa {
	  static layout(e, config) {
	    const style = document.head.appendChild(document.createElement("STYLE"));
	    if (!style.sheet)
	      throw new Error("count not create CSS style sheet");
	    style.appendChild(document.createTextNode(""));
	    new Impl(e, config).layout(style.sheet);
	    return style;
	  }
	}
	LayoutEa.CLASS_PREFIX = "layout-ea--";
	LayoutEa.CONTAINER_PREFIX = "layout-ea-";
	const LayoutEaGrid = {
	  containerClassSuffix: "grid",
	  layout: (parent, layout, sizes, callback) => new Grid(parent, sizes).layout(layout, callback)
	};
	class CallbackWrapper {
	  constructor(callback) {
	    this.callback = callback;
	    this.mediaName = "";
	    this.cssRules = [];
	  }
	  child({ e, cssSelector }, style, context) {
	    if (this.callback)
	      style = this.callback.eaChild(e, this.mediaName, cssSelector, style, context);
	    this.cssRules.push(cssSelector + "{" + style + "}");
	  }
	  parent({ e, cssSelector }, style, context) {
	    if (this.callback)
	      style = this.callback.eaParent(e, this.mediaName, cssSelector, style, context);
	    this.cssRules.push(cssSelector + "{" + style + "}");
	  }
	}
	const _Child = class {
	  constructor(e, name, parent) {
	    this.e = e;
	    this.children = {};
	    this.childMatches = {};
	    this.path = (parent == null ? void 0 : parent.path) && !name.startsWith("#") ? parent.path + " " + name : name;
	    this.cssSelector = this.selector(e);
	  }
	  die(error, context) {
	    if (context !== void 0)
	      error = error + ": '" + context + "'";
	    throw new Error(this.path + " " + error);
	  }
	  getChildRefs(templates, repeatContext, errLoc) {
	    const childrenList = Object.values(this.children);
	    const consumedCount = {};
	    let consumedCountIndex = 0;
	    const childRefs = templates.flatMap(({ selector, index }) => {
	      if (selector === "_")
	        return new ChildRef(selector, -1);
	      if (!selector) {
	        if (repeatContext.indexIncrement)
	          index += repeatContext.iteration * repeatContext.indexIncrement;
	        else
	          consumedCountIndex++;
	        const child = this.children[index];
	        if (child)
	          return new ChildRef("", index, false, child);
	      } else {
	        if (repeatContext.selectorIncrement[selector])
	          index += repeatContext.iteration * repeatContext.selectorIncrement[selector];
	        else
	          consumedCount[selector] = (consumedCount[selector] || 0) + 1;
	        let matches = this.childMatches[selector];
	        if (!matches)
	          this.childMatches[selector] = matches = childrenList.filter((child) => child.e.matches(selector));
	        if (index < 0)
	          return matches.map((child, ix) => new ChildRef(selector, ix, true, child));
	        if (index < matches.length)
	          return new ChildRef(selector, index, false, matches[index]);
	      }
	      if (!repeatContext.consumeAll)
	        this.die(errLoc + "index " + String(index) + " exceeds matches", selector);
	      return [];
	    }).filter(Boolean);
	    if (repeatContext.indexIncrement === 0)
	      repeatContext.indexIncrement = consumedCountIndex;
	    for (const sel in repeatContext.selectorIncrement) {
	      if (repeatContext.selectorIncrement[sel] === 0)
	        repeatContext.selectorIncrement[sel] = consumedCount[sel] || 0;
	    }
	    return childRefs;
	  }
	  parseChildRefs(layout, rest, errLoc) {
	    let p = layout.split(",").map((s) => s.trim());
	    let childRefs;
	    if (p[0].startsWith("[")) {
	      const closeBracket = layout.indexOf("]");
	      if (closeBracket <= 0)
	        this.die(errLoc + "missing ] in multi-child selector", layout);
	      p = layout.substring(closeBracket).split(",").map((s) => s.trim());
	      childRefs = layout.substring(1, closeBracket).split(",").flatMap((ref) => this.parseChildRef(ref, errLoc));
	    } else {
	      childRefs = this.parseChildRef(p[0], errLoc);
	    }
	    p.shift();
	    rest.push(...p);
	    return childRefs.filter(Boolean);
	  }
	  parseChildRef(ref, errLoc) {
	    if (!ref)
	      this.die(errLoc + "internal error empty selector for parseChildRef");
	    if (ref === "_")
	      return [{ selector: ref, index: 0 }];
	    let selector = "";
	    if (!/^\d/.test(ref)) {
	      const parts = ref.split("/").map((s) => s.trim());
	      if (parts.length > 2)
	        this.die(errLoc + "invalid selector", ref);
	      selector = parts[0];
	      if (parts.length === 1)
	        return [{ selector, index: 0 }];
	      ref = parts[1];
	    }
	    const range = ref.split("-").map((s) => s.trim());
	    if (range.length > 2)
	      this.die(errLoc + "invalid range", ref);
	    let from = this.parseIntOrWild(range[0], 0, -1, {}, errLoc + "range from");
	    const to = range.length === 1 ? from : this.parseInt(range[1], from, "errLoc + range to");
	    const indices = [];
	    while (from <= to)
	      indices.push({ selector, index: from++ });
	    return indices;
	  }
	  parseInt(str, min, error) {
	    const num = Number.parseInt(str);
	    if (Number.isNaN(num) || num < min)
	      this.die(error, str);
	    return Math.floor(num);
	  }
	  parseIntOrWild(str, min, wild, sizes, error) {
	    if (str)
	      str = sizes[str] || str;
	    return (str == null ? void 0 : str.startsWith("*")) ? wild : str ? this.parseInt(str, min, error) : min;
	  }
	  setContainerClass(containerClassSuffix) {
	    const containerClass = LayoutEa.CONTAINER_PREFIX + containerClassSuffix;
	    if (!this.e.classList.contains(containerClass))
	      this.e.classList.add(containerClass);
	  }
	  selector(e) {
	    if (e.id)
	      return "#" + e.id;
	    for (const cls in e.classList)
	      if (cls.startsWith(LayoutEa.CLASS_PREFIX))
	        return "." + cls;
	    const className = LayoutEa.CLASS_PREFIX + String(_Child.classCounter++);
	    e.classList.add(className);
	    return "." + className;
	  }
	};
	let Child = _Child;
	Child.classCounter = 0;
	class ChildRef {
	  constructor(ref, index, isWildcard = false, child) {
	    this.ref = ref;
	    this.isWildcard = isWildcard;
	    this.child = child;
	    this.duplicateReference = false;
	    this.isExplicit = (child == null ? void 0 : child.e.id) && ref.endsWith("#" + child.e.id) || !ref;
	    if (!ref)
	      ref = String(index);
	    else if (index > 0)
	      ref += "/" + String(index);
	  }
	  static markDuplicates(parent, holders, errLoc) {
	    const childReferences = new WeakMap();
	    holders.forEach((holder) => {
	      const child = holder.childRef.child;
	      if (!child)
	        return;
	      const previousNode = childReferences.get(child);
	      if (!previousNode) {
	        childReferences.set(child, holder);
	      } else if (holder.childRef.isExplicit) {
	        if (previousNode.childRef.isExplicit)
	          holder.childRef.die(parent, errLoc + "reference '" + holder.childRef.ref + "' duplicates", previousNode.childRef.ref);
	        previousNode.childRef.duplicateReference = true;
	        childReferences.set(child, holder);
	      } else if (previousNode.childRef.isWildcard) {
	        previousNode.childRef.duplicateReference = true;
	        childReferences.set(child, holder);
	      } else {
	        holder.childRef.duplicateReference = true;
	      }
	    });
	  }
	  die(parent, error, context) {
	    (this.child || new Child(parent.e, "BLANK", parent)).die(error, context);
	  }
	}
	class Impl {
	  constructor(e, config) {
	    this.cssRulesForElementPerMedia = new WeakMap();
	    this.layoutForMediaAndSelector = {};
	    this.cssRulesForMedia = [];
	    this.fallbackMediaName = "";
	    if (config.layout && config.mediaLayouts)
	      throw new Error("config layout and mediaLayouts are mutually exclusive");
	    this.callback = new CallbackWrapper(config.callback);
	    const dataPrefix = config.dataPrefix || "ea";
	    this.dataPropIgnore = dataPrefix + "Exclude";
	    this.dataPropIndex = dataPrefix + "Index";
	    this.debugPrefix = config.debug ? "LayoutEa:" : "";
	    this.ignore = config.ignore || [];
	    this.layoutRules = {};
	    const layout = config.layout || {};
	    for (const selector in layout)
	      selector.split(",").forEach((part) => this.layoutRules[part] = layout[selector]);
	    this.layoutSelectors = Object.keys(this.layoutRules).sort();
	    this.mediaLayouts = config.mediaLayouts;
	    this.root = new Child(e, this.makeName(e));
	    this.sizes = config.sizes || {};
	    this.strategy = config.strategy;
	    Object.keys(this.sizes).forEach((key) => {
	      if (key.startsWith("*") || /^\d/.test(key))
	        throw new Error("invalid key in config sizes: " + key);
	    });
	  }
	  layout(sheet) {
	    if (this.layoutSelectors.length > 0) {
	      this.layoutDepthFirst(this.root);
	      this.cssRulesForMedia.forEach((rule) => sheet.insertRule(rule));
	    } else if (this.mediaLayouts) {
	      const mediaNames = [];
	      this.mediaLayouts.forEach(({ fallback, layout, mediaQuery, name }) => {
	        if (!mediaQuery)
	          this.root.die("missing media query");
	        if (name && mediaNames.includes(name))
	          this.root.die("duplicate name", name);
	        if (!name && mediaNames.includes(mediaQuery))
	          this.root.die("duplicate media query as name", mediaQuery);
	        if (fallback && !mediaNames.includes(fallback))
	          this.root.die("unknown fallback media name", fallback);
	        mediaNames.push(name = name || mediaQuery);
	        this.layoutRules = {};
	        for (const selector in layout)
	          selector.split(",").forEach((part) => this.layoutRules[part] = layout[selector]);
	        this.layoutSelectors = Object.keys(this.layoutRules).sort();
	        if (this.layoutSelectors.length === 0)
	          this.root.die("missing layout provided for media " + name);
	        this.callback.mediaName = name;
	        this.cssRulesForMedia = [];
	        this.fallbackMediaName = fallback || mediaNames[0];
	        this.layoutDepthFirst(this.root);
	        sheet.insertRule("@media " + mediaQuery + "{" + this.cssRulesForMedia.join(" ") + "}");
	      });
	    }
	  }
	  layoutDepthFirst(parent) {
	    const selector = this.layoutSelectors.find((cssSelector) => parent.e.matches(cssSelector)) || "";
	    let layout = selector ? this.layoutRules[selector] : void 0;
	    const layoutsReferenced = [];
	    while (layout == null ? void 0 : layout.startsWith("@")) {
	      if (layoutsReferenced.includes(layout))
	        parent.die("circular reference for layout", layout);
	      const ref = this.layoutRules[layout.substring(1)] || this.layoutForMediaAndSelector[layout.substring(1)];
	      if (!ref)
	        parent.die("no valid layout found at reference", layout);
	      layout = ref;
	    }
	    for (let childIndex = 0, i = 0; i < parent.e.children.length; i++) {
	      const e = parent.e.children[i];
	      if (e.dataset[this.dataPropIgnore] !== void 0 || this.ignore.find((s) => e.matches(s))) {
	        if (this.debugPrefix)
	          console.log(this.debugPrefix, this.makeName(e), "ignored as instructed");
	        continue;
	      }
	      const child = new Child(e, this.makeName(e), parent);
	      this.layoutDepthFirst(child);
	      if (layout) {
	        const indexStr = e.dataset[this.dataPropIndex];
	        if (indexStr !== void 0)
	          childIndex = child.parseInt(indexStr, childIndex, "index " + indexStr);
	        parent.children[childIndex++] = child;
	      }
	    }
	    let cssRulesPerMedia = this.cssRulesForElementPerMedia.get(parent.e);
	    let cssRules = cssRulesPerMedia && !layout ? cssRulesPerMedia[this.fallbackMediaName] : void 0;
	    if (layout) {
	      this.layoutForMediaAndSelector[this.callback.mediaName + ":" + selector] = layout;
	      this.callback.cssRules = [];
	      this.strategy.layout(parent, layout, this.sizes, this.callback);
	      if (cssRulesPerMedia === void 0)
	        this.cssRulesForElementPerMedia.set(parent.e, cssRulesPerMedia = {});
	      cssRules = cssRulesPerMedia[this.callback.mediaName] = this.callback.cssRules;
	      parent.setContainerClass(this.strategy.containerClassSuffix);
	    }
	    if (cssRules)
	      this.cssRulesForMedia.push(...cssRules);
	  }
	  makeName(e) {
	    if (e.id)
	      return "#" + e.id;
	    const tag = e.tagName;
	    if (!e.parentElement)
	      throw new Error("orphan element " + tag);
	    const siblings = e.parentElement.children;
	    let tagCounter = 0;
	    for (let i = 0; i < siblings.length; i++) {
	      const sibling = siblings[i];
	      if (e === sibling)
	        return tagCounter ? tag + "/" + String(tagCounter) : tag;
	      if (tag === sibling.tagName && sibling.dataset[this.dataPropIgnore] === void 0)
	        tagCounter++;
	    }
	    throw new Error("could not match tag " + tag);
	  }
	}
	class RepeatContext {
	  constructor(parent, consumeAll, specs, errLoc) {
	    this.consumeAll = consumeAll;
	    this.selectorIncrement = {};
	    this.indexIncrement = 0;
	    this.iteration = 0;
	    specs.forEach((spec) => {
	      const p = spec.split("/").map((s) => s.trim());
	      if (p.length > 2)
	        parent.die(errLoc + "invalid repeat spec", spec);
	      if (p.length === 1) {
	        this.indexIncrement = parent.parseInt(p[0], 1, errLoc + "invalid repeat index increment");
	      } else {
	        this.selectorIncrement[p[0]] = parent.parseInt(p[1], 1, errLoc + "invalid repeat index increment for " + p[0]);
	      }
	    });
	  }
	}
	class Grid {
	  constructor(parent, sizes) {
	    this.parent = parent;
	    this.sizes = sizes;
	    this.cellsAboveRow = [0];
	    this.gridItems = [];
	  }
	  layout(layout, callback) {
	    const gridWidth = this.placeRows(this.parseLayout(layout));
	    const gridHeight = this.cellsAboveRow[this.cellsAboveRow.length - 1];
	    this.gridItems.forEach((item) => {
	      const child = item.childRef.child;
	      if (!child)
	        return;
	      const itemRow = this.cellsAboveRow[item.row];
	      const itemHeight = (item.height ? this.cellsAboveRow[item.row + item.height] : gridHeight) - itemRow;
	      callback.child(child, "grid-row:" + String(itemRow + 1) + "/span " + String(itemHeight) + ";grid-column:" + String(item.col + 1) + "/span " + String(item.width) + ";");
	    });
	    callback.parent(this.parent, "display:grid;align-content:stretch;justify-content:stretch;grid-auto-columns:" + String(100 / gridWidth) + "%;grid-auto-rows:" + String(100 / gridHeight) + "%;");
	  }
	  errLoc(row, col = -1) {
	    return "(row:" + String(row) + (col < 0 ? ") " : " col:" + String(col) + ") ");
	  }
	  parseLayout(layout) {
	    const gridItemsByRow = layout.split(";").flatMap((rowStr, row) => {
	      const errLoc = this.errLoc(row);
	      const items = rowStr.trim().split(/\s+/).filter(Boolean);
	      let rowHeight = 1;
	      let rowRepeat = 1;
	      let repeatSpec = [];
	      while (items.length > 0 && (items[0].startsWith("+") || items[0].startsWith("*"))) {
	        const item = items.shift() || "";
	        const value = item.substring(1);
	        if (item.startsWith("+")) {
	          rowHeight = this.parent.parseIntOrWild(value, 1, 1, this.sizes, errLoc + "row height");
	        } else {
	          rowRepeat = value.startsWith("!") ? 0 : this.parent.parseInt(value, 1, errLoc + "row repeat");
	          repeatSpec = value.split(",").map((s) => s.trim());
	          repeatSpec.shift();
	        }
	      }
	      const rowRepeatContext = new RepeatContext(this.parent, rowRepeat === 0, repeatSpec, errLoc);
	      const itemTemplates = items.map((item, col) => {
	        const errLoc2 = this.errLoc(row, col);
	        const p = [];
	        const childRefTemplates = this.parent.parseChildRefs(item, p, errLoc2);
	        if (childRefTemplates.length === 0)
	          this.parent.die(errLoc2 + "missing child reference", layout);
	        return {
	          childRefTemplates,
	          forceWidth: p.length > 0 && p[0].endsWith("!"),
	          height: p.length > 1 ? this.parent.parseIntOrWild(p[1], 1, 0, this.sizes, errLoc2 + "item height") : 1,
	          toGridBottom: p.length > 1 && p[1].endsWith("!"),
	          width: p.length > 0 ? this.parent.parseIntOrWild(p[0], 1, 0, this.sizes, errLoc2 + "item width") : 1
	        };
	      });
	      const gridItems = [];
	      for (let cellsAboveRepeatedRow = this.cellsAboveRow[this.cellsAboveRow.length - 1]; rowRepeatContext.consumeAll || rowRepeatContext.iteration < rowRepeat; rowRepeatContext.iteration++) {
	        const rowItems = itemTemplates.flatMap((itemTemplate, col) => this.parent.getChildRefs(itemTemplate.childRefTemplates, rowRepeatContext, this.errLoc(row, col)).map((childRef) => new GridItem(childRef, this.cellsAboveRow.length - 1, itemTemplate)));
	        if (rowRepeatContext.consumeAll && rowRepeatContext.iteration > 0 && rowItems.length === 0)
	          break;
	        gridItems.push(rowItems);
	        this.cellsAboveRow.push(cellsAboveRepeatedRow += rowHeight);
	      }
	      return gridItems;
	    });
	    ChildRef.markDuplicates(this.parent, gridItemsByRow.flat(), "");
	    return gridItemsByRow.map((rowItems) => rowItems.filter((item) => !item.childRef.duplicateReference));
	  }
	  placeItems(row, rowItems, multiRowItems, gridWidth) {
	    let col = 0;
	    let mrI = 0;
	    let wall = mrI < multiRowItems.length ? multiRowItems[mrI].col : gridWidth;
	    rowItems.forEach((item) => {
	      const gobbler = item.width === 0;
	      if (gobbler)
	        item.width = 1;
	      if (multiRowItems.length > 0 && mrI < multiRowItems.length && (gobbler || col + item.width > wall)) {
	        while (col + item.width > wall && wall < gridWidth) {
	          let mrIbefore = mrI;
	          let needed = col + item.width - wall;
	          while (item.forceWidth && needed > 0 && mrI < multiRowItems.length && !multiRowItems[mrI].hasHardHeight)
	            needed -= multiRowItems[mrI++].width;
	          if (needed <= 0) {
	            do
	              multiRowItems[mrIbefore].height = row - multiRowItems[mrIbefore].row;
	            while (++mrIbefore < mrI);
	          } else {
	            if (mrI < multiRowItems.length && (!item.forceWidth || multiRowItems[mrI].hasHardHeight))
	              mrI++;
	            col = multiRowItems[mrI - 1].col + multiRowItems[mrI - 1].width;
	          }
	          wall = mrI < multiRowItems.length ? multiRowItems[mrI].col : gridWidth;
	        }
	      }
	      if (col + item.width > wall)
	        item.childRef.die(this.parent, this.errLoc(row, col) + "width " + String(item.width) + " exceeds wall " + String(wall));
	      if (gobbler) {
	        for (; mrI < multiRowItems.length && !multiRowItems[mrI].hasHardHeight; mrI++)
	          multiRowItems[mrI].height = row - multiRowItems[mrI].row;
	        wall = multiRowItems.length > 0 && mrI < multiRowItems.length ? multiRowItems[mrI].col : gridWidth;
	        item.width = wall - col;
	      }
	      item.col = col;
	      col += item.width;
	      if (item.height !== 1) {
	        multiRowItems.splice(mrI, 0, item);
	        mrI++;
	      }
	      if (item.childRef.child)
	        this.gridItems.push(item);
	    });
	  }
	  placeRows(rowItemsList) {
	    let gridWidth = 0;
	    rowItemsList.forEach((rowItems) => gridWidth = Math.max(gridWidth, rowItems.reduce((sum, item) => sum += item.width, 0)));
	    let multiRowItems = [];
	    rowItemsList.forEach((rowItems, r) => {
	      this.placeItems(r, rowItems, multiRowItems, gridWidth);
	      multiRowItems = multiRowItems.filter((item) => item.height === 0 || item.row + item.height - 1 > r);
	    });
	    const nRows = this.cellsAboveRow.length - 1;
	    multiRowItems.forEach((item) => {
	      if (item.height > 0)
	        item.childRef.die(this.parent, this.errLoc(item.row, item.col) + "height " + String(item.height) + " exceeds specification rows " + String(nRows));
	      item.height = nRows - item.row;
	    });
	    return gridWidth;
	  }
	}
	class GridItem {
	  constructor(childRef, row, template) {
	    this.childRef = childRef;
	    this.row = row;
	    this.col = 0;
	    this.forceWidth = template.forceWidth;
	    this.hasHardHeight = template.toGridBottom || template.height > 0;
	    this.height = template.height;
	    this.width = template.width;
	  }
	}

	exports.LayoutEa = LayoutEa;
	exports.LayoutEaGrid = LayoutEaGrid;

}));
