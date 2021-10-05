// =================================================================================================================================
//						L A Y O U T E A
// =================================================================================================================================
export class LayoutEa {
	public static readonly CLASS_PREFIX = 'layout-ea--';
	public static readonly CONTAINER_PREFIX = 'layout-ea-';

	// =============================================================================================================================
	public static layout(e: HTMLElement, config: Readonly<LayoutEaConfig>): HTMLStyleElement {
		const style = document.head.appendChild(document.createElement('STYLE')) as HTMLStyleElement;
		if (!style.sheet) throw new Error('count not create CSS style sheet');
		style.appendChild(document.createTextNode('')); // WebKit hack
		new Impl(e, config).layout(style.sheet);
		return style;
	}
}

// =================================================================================================================================
//						L A Y O U T E A C A L L B A C K
// =================================================================================================================================
export interface LayoutEaCallback {
	eaChild(e: HTMLElement, mediaName: string, selector: string, style: string, context?: unknown): string;
	eaParent(e: HTMLElement, mediaName: string, selector: string, style: string, context?: unknown): string;
}

// =================================================================================================================================
//						L A Y O U T E A C O N F I G
// =================================================================================================================================
export interface LayoutEaConfig {
	readonly callback?: LayoutEaCallback;
	readonly dataPrefix?: string; // prefix for data- props instead of the default 'ea'
	readonly debug?: boolean;
	readonly ignore?: string[]; // list of CSS selectors for HTML elements to ignore
	readonly layout?: Record<string, string>;
	readonly mediaLayouts?: LayoutEaMediaLayout[];
	readonly sizes?: Record<string, string>;
	readonly strategy: LayoutEaStrategy;
}

// =================================================================================================================================
//						L A Y O U T E A G R I D
// =================================================================================================================================
export const LayoutEaGrid: LayoutEaStrategy = {
	containerClassSuffix: 'grid',

	// =============================================================================================================================
	layout: (parent: Child, layout: string, sizes: Record<string, string>, callback: CallbackWrapper) =>
		new Grid(parent, sizes).layout(layout, callback)
};

// =================================================================================================================================
//						L A Y O U T E A M E D I A L A Y O U T
// =================================================================================================================================
export interface LayoutEaMediaLayout {
	fallback?: string;
	layout: Record<string, string>;
	mediaQuery: string;
	name?: string;
}

// =================================================================================================================================
//						L A Y O U T E A S T R A T E G Y
// =================================================================================================================================
export interface LayoutEaStrategy {
	readonly containerClassSuffix: string;
	layout(parent: Child, layout: string, sizes: Record<string, string>, callback: CallbackWrapper): void;
}

// =================================================================================================================================
// =================================================================================================================================
// =================================================	P R I V A T E	============================================================
// =================================================================================================================================
// =================================================================================================================================

// =================================================================================================================================
//						C A L L B A C K W R A P P E R
// =================================================================================================================================
class CallbackWrapper {
	public mediaName = '';
	public cssRules: string[] = [];

	// =============================================================================================================================
	public constructor(private readonly callback?: LayoutEaCallback) { /**/ }

	// =============================================================================================================================
	public child({ e, cssSelector }: Child, style: string, context?: unknown) {
		if (this.callback) style = this.callback.eaChild(e, this.mediaName, cssSelector, style, context);
		this.cssRules.push(cssSelector + style);
	}

	// =============================================================================================================================
	public parent({ e, cssSelector }: Child, style: string, context?: unknown) {
		if (this.callback) style = this.callback.eaParent(e, this.mediaName, cssSelector, style, context);
		this.cssRules.push(cssSelector + style);
	}
}

// =================================================================================================================================
//						C H I L D
// =================================================================================================================================
class Child {
	private static classCounter = 0;
	public readonly children: Record<string, Child> = {};
	public readonly cssSelector;
	private readonly childMatches: Record<string, Child[]> = {}; // HTML ID, CSS class, HTML tagName
	private readonly path: string;

	// =============================================================================================================================
	public constructor(public readonly e: HTMLElement, name: string, parent?: Child) {
		this.path = parent?.path && !name.startsWith('#') ? parent.path + ' ' + name : name;
		this.cssSelector = this.selector(e);
	}

	// =============================================================================================================================
	public die(error: string, context?: string) {
		if (context !== undefined) error = error + ': \'' + context + '\'';
		throw new Error(this.path + ' ' + error);
	}

	// =============================================================================================================================
	public getChildRefs(templates: ChildRefTemplate[], repeatContext: RepeatContext, errLoc: string): ChildRef[] {
		const childrenList = Object.values(this.children);
		const consumedCount: Record<string, number> = {}; // will be used to calculate repeatContext.selectorIncrement if not set
		let consumedCountIndex = 0; // will be used to calculate repeatContext.indexIncrement if not set
		const childRefs = templates.flatMap(({ selector, index }) => {
			if (selector === '_') return new ChildRef(selector, -1);
			if (!selector) { // child index
				if (repeatContext.indexIncrement)
					index += repeatContext.iteration * repeatContext.indexIncrement;
				else
					consumedCountIndex++;
				const child = this.children[index];
				if (child) return new ChildRef('', index, false, child);
			} else {
				if (repeatContext.selectorIncrement[selector])
					index += repeatContext.iteration * repeatContext.selectorIncrement[selector];
				else
					consumedCount[selector] = (consumedCount[selector] || 0) + 1;
				let matches = this.childMatches[selector];
				if (!matches) this.childMatches[selector] = matches = childrenList.filter(child => child.e.matches(selector));
				if (index < 0) return matches.map((child, ix) => new ChildRef(selector, ix, true, child));
				if (index < matches.length) return new ChildRef(selector, index, false, matches[index]);
			}
			if (!repeatContext.consumeAll) this.die(errLoc + 'index ' + String(index) + ' exceeds matches', selector);
			return [];
		}).filter(Boolean);
		if (repeatContext.indexIncrement === 0) repeatContext.indexIncrement = consumedCountIndex;
		for (const sel in repeatContext.selectorIncrement) {
			if (repeatContext.selectorIncrement[sel] === 0) repeatContext.selectorIncrement[sel] = consumedCount[sel] || 0;
		}
		return childRefs;
	}

	// =============================================================================================================================
	public parseChildRefs(layout: string, rest: string[], errLoc: string): ChildRefTemplate[] {
		let p = layout.split(',').map(s => s.trim());
		let childRefs: ChildRefTemplate[];
		if (p[0].startsWith('[')) { // multiple childRefs
			const closeBracket = layout.indexOf(']');
			if (closeBracket <= 0) this.die(errLoc + 'missing ] in multi-child selector', layout);
			p = layout.substring(closeBracket).split(',').map(s => s.trim());
			childRefs = layout.substring(1, closeBracket).split(',').flatMap(ref => this.parseChildRef(ref, errLoc));
		} else {
			childRefs = this.parseChildRef(p[0], errLoc);
		}
		p.shift();
		rest.push(...p);
		return childRefs.filter(Boolean);
	}

	// =============================================================================================================================
	private parseChildRef(ref: string, errLoc: string): ChildRefTemplate[] {
		if (!ref) this.die(errLoc + 'internal error empty selector for parseChildRef');
		if (ref === '_') return [{ selector: ref, index: 0 }];
		let selector = '';
		if (!/^\d/.test(ref)) { // e.g. BUTTON/[1-2]
			const parts = ref.split('/').map(s => s.trim());
			if (parts.length > 2) this.die(errLoc + 'invalid selector', ref);
			selector = parts[0];
			if (parts.length === 1) return [{ selector, index: 0 }];
			ref = parts[1];
		}
		const range = ref.split('-').map(s => s.trim());
		if (range.length > 2) this.die(errLoc + 'invalid range', ref);
		let from = this.parseIntOrWild(range[0], 0, -1, {}, errLoc + 'range from'); // wildcard => -1
		const to = range.length === 1 ? from : this.parseInt(range[1], from, 'errLoc + range to');
		const indices: ChildRefTemplate[] = [];
		while (from <= to) indices.push({ selector, index: from++ });
		return indices;
	}

	// =============================================================================================================================
	public parseInt(str: string, min: number, error: string) {
		const num = Number.parseInt(str);
		if (Number.isNaN(num) || num < min) this.die(error, str);
		return Math.floor(num);
	}

	// =============================================================================================================================
	public parseIntOrWild(str: string | undefined, min: number, wild: number, sizes: Record<string, string>, error: string) {
		if (str) str = sizes[str] || str;
		return str?.startsWith('*') ? wild : str ? this.parseInt(str, min, error) : min;
	}

	// =============================================================================================================================
	public setContainerClass(containerClassSuffix: string): void {
		const containerClass = LayoutEa.CONTAINER_PREFIX + containerClassSuffix;
		if (!this.e.classList.contains(containerClass)) this.e.classList.add(containerClass);
	}

	// =============================================================================================================================
	private selector(e: HTMLElement): string {
		if (e.id) return '#' + e.id;
		for (const cls in e.classList) if (cls.startsWith(LayoutEa.CLASS_PREFIX)) return '.' + cls;
		const className = LayoutEa.CLASS_PREFIX + String(Child.classCounter++);
		e.classList.add(className);
		return '.' + className;
	}
}

// =================================================================================================================================
//						C H I L D R E F
// =================================================================================================================================
class ChildRef {
	private readonly isExplicit: boolean;
	public duplicateReference = false;

	// =============================================================================================================================
	public static markDuplicates(parent: Child, holders: ChildRefHolder[], errLoc: string) {
		// mark duplicate references while prioritizing explicit references (HTML ID, child index) over wildcard
		const childReferences = new WeakMap<Child, ChildRefHolder>();
		holders.forEach(holder => {
			const child = holder.childRef.child;
			if (!child) return; // blank
			const previousNode = childReferences.get(child);
			if (!previousNode) {
				childReferences.set(child, holder);
			} else if (holder.childRef.isExplicit) {
				if (previousNode.childRef.isExplicit) holder.childRef.die(parent, errLoc
					+ 'reference \'' + holder.childRef.ref + '\' duplicates', previousNode.childRef.ref);
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

	// =============================================================================================================================
	public constructor(public readonly ref: string, index: number, private readonly isWildcard = false, public readonly child?: Child) {
		this.isExplicit = child?.e.id && ref.endsWith('#' + child.e.id) || !ref;
		if (!ref) ref = String(index);
		else if (index > 0) ref += '/' + String(index);
	}

	// =============================================================================================================================
	public die(parent: Child, error: string, context?: string) {
		(this.child || new Child(parent.e, 'BLANK', parent)).die(error, context);
	}
}

// =================================================================================================================================
//						C H I L D R E F H O L D E R
// =================================================================================================================================
interface ChildRefHolder {
	readonly childRef: ChildRef;
}

// =================================================================================================================================
//						C H I L D R E F T E M P L A T E
// =================================================================================================================================
interface ChildRefTemplate {
	readonly selector: string; // '_' => blank, '' => child index, or CSS selector
	index: number; // -1 => wildcard
}

// =================================================================================================================================
//						I M P L
// =================================================================================================================================
class Impl {
	private readonly callback: CallbackWrapper;
	private readonly cssRulesForElementPerMedia: WeakMap<HTMLElement, Record<string, string[]>> = new WeakMap();
	private readonly dataPropIgnore: string;
	private readonly dataPropIndex: string;
	private readonly debugPrefix: string;
	private readonly ignore: string[];
	private readonly mediaLayouts?: LayoutEaMediaLayout[];
	private readonly layoutForMediaAndSelector: Record<string, string> = {}; // media::selector => layout
	private readonly root: Child;
	private readonly sizes: Record<string, string>;
	private readonly strategy: LayoutEaStrategy;
	private cssRulesForMedia: string[] = [];
	private fallbackMediaName = '';
	private layoutRules: Record<string, string>;
	private layoutSelectors: string[];

	// =============================================================================================================================
	public constructor(e: HTMLElement, config: Readonly<LayoutEaConfig>) {
		if (config.layout && config.mediaLayouts) throw new Error('config layout and mediaLayouts are mutually exclusive');
		this.callback = new CallbackWrapper(config.callback);
		const dataPrefix = config.dataPrefix || 'ea';
		this.dataPropIgnore = dataPrefix + 'X';
		this.dataPropIndex = dataPrefix + 'I';
		this.debugPrefix = config.debug ? 'LayoutEa:' : '';
		this.ignore = config.ignore || [];
		this.layoutRules = {}; // flatten multiple layout keys into one list
		const layout = config.layout || {};
		for (const selector in layout) selector.split(',').forEach(part => this.layoutRules[part] = layout[selector]);
		this.layoutSelectors = Object.keys(this.layoutRules).sort(); // sorts '#', then '.', then alphanumeric		
		this.mediaLayouts = config.mediaLayouts;
		this.root = new Child(e, this.makeName(e));
		this.sizes = config.sizes || {};
		this.strategy = config.strategy;
		Object.keys(this.sizes).forEach(key => {
			if (key.startsWith('*') || /^\d/.test(key)) throw new Error('invalid key in config sizes: ' + key);
		});
	}

	// =============================================================================================================================
	public layout(sheet: CSSStyleSheet) {
		if (this.layoutSelectors.length > 0) {
			this.layoutDepthFirst(this.root);
			this.cssRulesForMedia.forEach(rule => sheet.insertRule(rule));
		} else if (this.mediaLayouts) {
			const mediaNames: string[] = [];
			this.mediaLayouts.forEach(({ fallback, layout, mediaQuery, name }) => {
				if (!mediaQuery) this.root.die('missing media query'); // test for ''
				if (fallback && !mediaNames.includes(fallback)) this.root.die('unknown fallback media name', fallback);
				mediaNames.push(name = name || mediaQuery);
				this.layoutRules = {}; // flatten multiple layout keys into one list
				for (const selector in layout) selector.split(',').forEach(part => this.layoutRules[part] = layout[selector]);
				this.layoutSelectors = Object.keys(this.layoutRules).sort(); // sorts '#', then '.', then alphanumeric		
				if (this.layoutSelectors.length === 0) this.root.die('missing layout provided for media ' + name);
				this.callback.mediaName = name;
				this.cssRulesForMedia = [];
				this.fallbackMediaName = fallback || mediaNames[0];
				this.layoutDepthFirst(this.root);
				sheet.insertRule('@media ' + mediaQuery + '{' + this.cssRulesForMedia.join(' ') + '}');
			});
		}
	}

	// =============================================================================================================================
	private layoutDepthFirst(parent: Child) {
		const selector = this.layoutSelectors.find(cssSelector => parent.e.matches(cssSelector)) || '';
		let layout = selector ? this.layoutRules[selector] : undefined;
		const layoutsReferenced: string[] = [];
		while (layout?.startsWith('@')) {
			if (layoutsReferenced.includes(layout)) parent.die('circular reference for layout', layout);
			const ref = this.layoutRules[layout.substring(1)] || this.layoutForMediaAndSelector[layout.substring(1)];
			if (!ref) parent.die('no valid layout found at reference', layout);
			layout = ref;
		}

		for (let childIndex = 0, i = 0; i < parent.e.children.length; i++) {
			const e = parent.e.children[i] as HTMLElement;
			if (e.dataset[this.dataPropIgnore] !== undefined || this.ignore.find(s => e.matches(s))) {
				if (this.debugPrefix) console.log(this.debugPrefix, this.makeName(e), 'ignored as instructed');
				continue;
			}
			const child = new Child(e, this.makeName(e), parent);
			this.layoutDepthFirst(child);
			if (layout) {
				const indexStr = e.dataset[this.dataPropIndex];
				if (indexStr !== undefined) childIndex = child.parseInt(indexStr, childIndex, 'index ' + indexStr);
				parent.children[childIndex++] = child;
			}
		}

		let cssRulesPerMedia = this.cssRulesForElementPerMedia.get(parent.e);
		let cssRules = cssRulesPerMedia && !layout ? cssRulesPerMedia[this.fallbackMediaName] : undefined;
		if (layout) {
			this.layoutForMediaAndSelector[this.callback.mediaName + ':' + selector] = layout;
			this.callback.cssRules = [];
			this.strategy.layout(parent, layout, this.sizes, this.callback);
			if (cssRulesPerMedia === undefined) this.cssRulesForElementPerMedia.set(parent.e, cssRulesPerMedia = {});
			cssRules = cssRulesPerMedia[this.callback.mediaName] = this.callback.cssRules;
			parent.setContainerClass(this.strategy.containerClassSuffix);
		}
		if (cssRules) this.cssRulesForMedia.push(...cssRules);
	}

	// =============================================================================================================================
	private makeName(e: HTMLElement): string {
		if (e.id) return '#' + e.id;
		const tag = e.tagName;
		if (!e.parentElement) throw new Error('orphan element ' + tag);
		const siblings = e.parentElement.children;
		let tagCounter = 0;
		for (let i = 0; i < siblings.length; i++) {
			const sibling = siblings[i] as HTMLElement;
			if (e === sibling) return tagCounter ? tag + '/' + String(tagCounter) : tag;
			if (tag === sibling.tagName && sibling.dataset[this.dataPropIgnore] === undefined) tagCounter++;
		}
		throw new Error('could not match tag ' + tag);
	}
}

// =================================================================================================================================
//						R E P E A T C O N T E X T
// =================================================================================================================================
class RepeatContext {
	public readonly selectorIncrement: Record<string, number> = {}; // selector => indexIncrement;
	public indexIncrement = 0;
	public iteration = 0;

	// =============================================================================================================================
	public constructor(parent: Child, public readonly consumeAll: boolean, specs: string[], errLoc: string) {
		specs.forEach(spec => {
			const p = spec.split('/').map(s => s.trim());
			if (p.length > 2) parent.die(errLoc + 'invalid repeat spec', spec);
			if (p.length === 1) {
				this.indexIncrement = parent.parseInt(p[0], 1, errLoc + 'invalid repeat index increment');
			} else {
				this.selectorIncrement[p[0]] = parent.parseInt(p[1], 1, errLoc + 'invalid repeat index increment for ' + p[0]);
			}
		});
	}
}

// =================================================================================================================================
// =================================================================================================================================
// =============================================== P R I V A T E  G R I D ==========================================================
// =================================================================================================================================
// =================================================================================================================================

// =================================================================================================================================
//						G R I D
// =================================================================================================================================
class Grid {
	private readonly cellsAboveRow: number[] = [0];
	private readonly gridItems: GridItem[] = [];

	// =============================================================================================================================
	public constructor(private readonly parent: Child, private readonly sizes: Record<string, string>) { /**/ }

	// =============================================================================================================================
	public layout(layout: string, callback: CallbackWrapper) {
		const gridWidth = this.placeRows(this.parseLayout(layout));
		const gridHeight = this.cellsAboveRow[this.cellsAboveRow.length - 1];
		this.gridItems.forEach(item => {
			const child = item.childRef.child;
			if (!child) return;
			const itemRow = this.cellsAboveRow[item.row];
			const itemHeight = (item.height ? this.cellsAboveRow[item.row + item.height] : gridHeight) - itemRow;
			callback.child(child, '{grid-row:' + String(itemRow + 1) + '/span ' + String(itemHeight) + ';grid-column:'
				+ String(item.col + 1) + '/span ' + String(item.width) + '}');
		});
		callback.parent(this.parent, '{display:grid;align-content:stretch;justify-content:stretch;grid-auto-columns:'
			+ String(100 / gridWidth) + '%;grid-auto-rows:' + String(100 / gridHeight) + '%}');
	}

	// =============================================================================================================================
	private errLoc(row: number, col = -1) {
		return '(row:' + String(row) + (col < 0 ? ') ' : ' col:' + String(col) + ') ');
	}

	// =============================================================================================================================
	private parseLayout(layout: string) {
		const gridItemsByRow = layout.split(';').flatMap((rowStr, row) => {
			const errLoc = this.errLoc(row);
			const items = rowStr.trim().split(/\s+/).filter(Boolean);
			let rowHeight = 1;
			let rowRepeat = 1;
			let repeatSpec: string[] = [];
			while (items.length > 0 && (items[0].startsWith('+') || items[0].startsWith('*'))) {
				const item = items.shift() || '';
				const value = item.substring(1);
				if (item.startsWith('+')) {
					rowHeight = this.parent.parseIntOrWild(value, 1, 1, this.sizes, errLoc + 'row height');
				} else {
					rowRepeat = value.startsWith('!') ? 0 : this.parent.parseInt(value, 1, errLoc + 'row repeat');
					repeatSpec = value.split(',').map(s => s.trim());
					repeatSpec.shift();
				}
			}
			const rowRepeatContext = new RepeatContext(this.parent, rowRepeat === 0, repeatSpec, errLoc);

			// construct item templates for this row
			const itemTemplates = items.map((item, col) => {
				const errLoc = this.errLoc(row, col);
				const p: string[] = [];
				const childRefTemplates = this.parent.parseChildRefs(item, p, errLoc);
				if (childRefTemplates.length === 0) this.parent.die(errLoc + 'missing child reference', layout);
				return {
					childRefTemplates,
					forceWidth: p.length > 0 && p[0].endsWith('!'),
					height: p.length > 1 ? this.parent.parseIntOrWild(p[1], 1, 0, this.sizes, errLoc + 'item height') : 1,
					toGridBottom: p.length > 1 && p[1].endsWith('!'),
					width: p.length > 0 ? this.parent.parseIntOrWild(p[0], 1, 0, this.sizes, errLoc + 'item width') : 1
				}
			});

			// generate rowRepeat copies of this row using the item templates for the row
			const gridItems: GridItem[][] = [];
			for (let cellsAboveRepeatedRow = this.cellsAboveRow[this.cellsAboveRow.length - 1]
				; rowRepeatContext.consumeAll || rowRepeatContext.iteration < rowRepeat
				; rowRepeatContext.iteration++) {
				const rowItems = itemTemplates.flatMap((itemTemplate, col) =>
					this.parent.getChildRefs(itemTemplate.childRefTemplates, rowRepeatContext, this.errLoc(row, col))
						.map(childRef => new GridItem(childRef, this.cellsAboveRow.length - 1, itemTemplate)));
				if (rowRepeatContext.consumeAll && rowRepeatContext.iteration > 0 && rowItems.length === 0) break;
				gridItems.push(rowItems);
				this.cellsAboveRow.push(cellsAboveRepeatedRow += rowHeight);
			}
			return gridItems;
		});

		// identify and purge duplicate references
		ChildRef.markDuplicates(this.parent, gridItemsByRow.flat(), '');
		return gridItemsByRow.map(rowItems => rowItems.filter(item => !item.childRef.duplicateReference));
	}

	// =============================================================================================================================
	private placeItems(row: number, rowItems: GridItem[], multiRowItems: GridItem[], gridWidth: number) {
		let col = 0;
		let mrI = 0;
		let wall = mrI < multiRowItems.length ? multiRowItems[mrI].col : gridWidth;
		rowItems.forEach(item => {
			const gobbler = item.width === 0;
			if (gobbler) item.width = 1; // set minimum allowable width for now to get a starting column
			if (multiRowItems.length > 0 && mrI < multiRowItems.length && (gobbler || col + item.width > wall)) {
				while (col + item.width > wall && wall < gridWidth) { // see if we can close multiRow items to make room
					let mrIbefore = mrI;
					let needed = col + item.width - wall;
					while (item.forceWidth && needed > 0 && mrI < multiRowItems.length && !multiRowItems[mrI].hasHardHeight)
						needed -= multiRowItems[mrI++].width;
					if (needed <= 0) { // found enough room; close the multiRow items protruding into our row
						do multiRowItems[mrIbefore].height = row - multiRowItems[mrIbefore].row; while (++mrIbefore < mrI);
					} else { // not enough room; jump over the hard multiRow items and try to find room to their right
						if (mrI < multiRowItems.length && (!item.forceWidth || multiRowItems[mrI].hasHardHeight)) mrI++;
						col = multiRowItems[mrI - 1].col + multiRowItems[mrI - 1].width;
					}
					wall = mrI < multiRowItems.length ? multiRowItems[mrI].col : gridWidth;
				}
			}
			if (col + item.width > wall) item.childRef.die(this.parent, this.errLoc(row, col) + 'width ' + String(item.width)
				+ ' exceeds wall ' + String(wall));

			if (gobbler) {
				for (; mrI < multiRowItems.length && !multiRowItems[mrI].hasHardHeight; mrI++)
					multiRowItems[mrI].height = row - multiRowItems[mrI].row;;
				wall = multiRowItems.length > 0 && mrI < multiRowItems.length ? multiRowItems[mrI].col : gridWidth;
				item.width = wall - col;
			}

			item.col = col;
			col += item.width;
			if (item.height !== 1) {
				multiRowItems.splice(mrI, 0, item);
				mrI++;
			}
			if (item.childRef.child) this.gridItems.push(item);
		});
	}

	// =============================================================================================================================
	private placeRows(rowItemsList: GridItem[][]): number {
		let gridWidth = 0;
		rowItemsList.forEach(rowItems => gridWidth = Math.max(gridWidth, rowItems.reduce((sum, item) => sum += item.width, 0)));

		let multiRowItems: GridItem[] = [];
		rowItemsList.forEach((rowItems, r) => { // calculate width for the items in each row
			this.placeItems(r, rowItems, multiRowItems, gridWidth);
			multiRowItems = multiRowItems.filter(item => item.height === 0 || item.row + item.height - 1 > r);
		});

		const nRows = this.cellsAboveRow.length - 1;
		multiRowItems.forEach(item => { // close multi-row items with wildcard heights and throw error for excess hardcoded heights
			if (item.height > 0) item.childRef.die(this.parent, this.errLoc(item.row, item.col) + 'height ' + String(item.height)
				+ ' exceeds specification rows ' + String(nRows));
			item.height = nRows - item.row;
		});
		return gridWidth;
	}
}

// =================================================================================================================================
//						G R I D I T E M
// =================================================================================================================================
class GridItem implements ChildRefHolder {
	public readonly forceWidth: boolean;
	public readonly hasHardHeight: boolean;
	public col = 0;
	public height: number;
	public width: number;

	// =============================================================================================================================
	public constructor(public readonly childRef: ChildRef, public readonly row: number, template: GridItemTemplate) {
		this.forceWidth = template.forceWidth;
		this.hasHardHeight = template.toGridBottom || template.height > 0;
		this.height = template.height;
		this.width = template.width;
	}
}

// =================================================================================================================================
//						G R I D I T E M T E M P L A T E
// =================================================================================================================================
interface GridItemTemplate {
	readonly childRefTemplates: ChildRefTemplate[];
	readonly forceWidth: boolean;
	readonly height: number;
	readonly toGridBottom: boolean;
	readonly width: number;
}
