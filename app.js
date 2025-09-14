(() => {
  // ======= State =======
  let currentHtml = '';
  let currentFileName = '';
  let htmlContent = null;
  const labels = new Map(); // name -> {color, type, sublabels, params}
  let currentSelection = null;
  let expandedNodes = new Set(); // Track expanded tree nodes
  let selectedNode = null; // Track selected tree node
  let editingNode = null; // Track node being edited
  let currentParamElement = null; // Track element being edited for parameters

  // ======= DOM Elements =======
  const elements = {
    htmlFileInput: document.getElementById('html-file-input'),
    downloadBtn: document.getElementById('download-html'),
    clearBtn: document.getElementById('clear-all'),
    htmlContent: document.getElementById('html-content'),
    currentFilename: document.getElementById('current-filename'),
    newLabelName: document.getElementById('new-label-name'),
    newLabelColor: document.getElementById('new-label-color'),
    addRootLabel: document.getElementById('add-root-label'),
    labelTree: document.getElementById('label-tree'),
    contextMenu: document.getElementById('context-menu'),
    labelOptions: document.getElementById('label-options'),
    paramMenu: document.getElementById('param-menu'),
    paramMenuTitle: document.getElementById('param-menu-title'),
    paramForm: document.getElementById('param-form'),
    saveParams: document.getElementById('save-params'),
    cancelParams: document.getElementById('cancel-params'),
    totalMentions: document.getElementById('total-mentions'),
    labelTypes: document.getElementById('label-types')
  };

  

  // ======= Utilities =======
  function getContrastColor(hexcolor) {
    hexcolor = hexcolor.replace('#', '');
    const r = parseInt(hexcolor.substr(0, 2), 16);
    const g = parseInt(hexcolor.substr(2, 2), 16);
    const b = parseInt(hexcolor.substr(4, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? 'black' : 'white';
  }

  function generateRandomColor() {
    const colors = ['#6aa3ff', '#20c997', '#ffc107', '#dc3545', '#6f42c1', '#fd7e14', '#e83e8c'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  // ======= Enhanced Label Management =======

  function createLabel(name, color, type = "structured", params = {}) {
    return {
      name,
      color,
      type,
      params: new Map(Object.entries(params)),
      sublabels: new Map()  // nested label tree
    };
  }

  function addLabel(name, color, parentPath = []) {
    if (!name.trim()) return false;
    
    let current = labels;
    
    // Navigate to parent
    for (const pathSegment of parentPath) {
      if (current.has(pathSegment)) {
        current = current.get(pathSegment).sublabels;
      } else {
        return false; // Parent doesn't exist
      }
    }
    
    if (current.has(name)) {
      alert('Label with this name already exists at this level!');
      return false;
    }
    
    current.set(name, createLabel(name, color));
    refreshTreeUI();
    return true;
  }

  function addParameter(labelPath, paramName, paramValue = '') {
    const label = getLabelByPath(labelPath);
    if (!label || !paramName.trim()) return false;
    
    // Preserve case of parameter name
    label.params.set(paramName, paramValue);
    refreshTreeUI();
    return true;
  }

  function getLabelByPath(path) {
    let current = labels;
    
    for (let i = 0; i < path.length; i++) {
      const segment = path[i];
      if (current.has(segment)) {
        if (i === path.length - 1) {
          return current.get(segment);
        } else {
          current = current.get(segment).sublabels;
        }
      } else {
        return null;
      }
    }
    
    return null;
  }

  function deleteLabel(labelPath) {
    if (labelPath.length === 0) return false;
    
    const parentPath = labelPath.slice(0, -1);
    const labelName = labelPath[labelPath.length - 1];
    
    let current = labels;
    
    // Navigate to parent
    for (const pathSegment of parentPath) {
      if (current.has(pathSegment)) {
        current = current.get(pathSegment).sublabels;
      } else {
        return false;
      }
    }
    
    if (current.has(labelName)) {
      current.delete(labelName);
      refreshTreeUI();
      return true;
    }
    
    return false;
  }

  function deleteParameter(labelPath, paramName) {
    const label = getLabelByPath(labelPath);
    if (!label) return false;
    
    label.params.delete(paramName);
    refreshTreeUI();
    return true;
  }

  // ======= Tree UI Management =======

  function refreshTreeUI() {
    renderTree();
    updateLabelOptions();
    updateStats();
  }

  function renderTree() {
    elements.labelTree.innerHTML = '';
    renderTreeLevel(labels, [], 0, elements.labelTree);
  }

  function renderTreeLevel(labelMap, currentPath, level, container) {
    labelMap.forEach((label, name) => {
      const nodePath = [...currentPath, name];
      const nodeId = nodePath.join('.');
      
      // Create tree node
      const treeNode = document.createElement('div');
      treeNode.className = 'tree-node';
      
      // Create tree item
      const treeItem = document.createElement('div');
      treeItem.className = `tree-item level-${level}`;
      treeItem.dataset.path = JSON.stringify(nodePath);
      
      if (selectedNode === nodeId) {
        treeItem.classList.add('selected');
      }
      
      // Expand/collapse button
      const expandBtn = document.createElement('button');
      expandBtn.className = 'tree-expand-btn';
      const hasChildren = label.sublabels.size > 0 || label.params.size > 0;
      
      if (hasChildren) {
        const isExpanded = expandedNodes.has(nodeId);
        expandBtn.classList.add(isExpanded ? 'expanded' : 'collapsed');
        expandBtn.onclick = (e) => {
          e.stopPropagation();
          toggleNode(nodeId);
        };
      } else {
        expandBtn.classList.add('no-children');
      }
      
      // Icon
      const icon = document.createElement('div');
      icon.className = 'tree-icon folder';
      
      // Color indicator
      const colorIndicator = document.createElement('div');
      colorIndicator.className = 'tree-color-indicator';
      colorIndicator.style.backgroundColor = label.color;
      
      // Label text
      const labelText = document.createElement('div');
      labelText.className = 'tree-label';
      labelText.textContent = name;
      
      // Actions
      const actions = document.createElement('div');
      actions.className = 'tree-actions';
      
      if (level === 0) {
        const addBtn = document.createElement('button');
        addBtn.className = 'tree-action-btn add';
        addBtn.title = 'Add sublabel';
        addBtn.onclick = (e) => {
            e.stopPropagation();
            promptAddSublabel(nodePath, treeNode);
        };
        actions.appendChild(addBtn);
        }
      
      const addParamBtn = document.createElement('button');
      addParamBtn.className = 'tree-action-btn edit';
      addParamBtn.title = 'Add parameter';
      addParamBtn.onclick = (e) => {
        e.stopPropagation();
        promptAddParameter(nodePath, treeNode);
      };
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'tree-action-btn delete';
      deleteBtn.title = 'Delete label';
      deleteBtn.onclick = (e) => {
        e.stopPropagation();
        if (confirm(`Delete "${name}" and all its children?`)) {
          deleteLabel(nodePath);
        }
      };
      
      //actions.appendChild(addBtn);
      actions.appendChild(addParamBtn);
      actions.appendChild(deleteBtn);
      
      // Assemble tree item
      treeItem.appendChild(expandBtn);
      treeItem.appendChild(icon);
      treeItem.appendChild(colorIndicator);
      treeItem.appendChild(labelText);
      treeItem.appendChild(actions);
      
      // Click handler for selection
      treeItem.onclick = (e) => {
        if (e.target === treeItem || e.target === labelText || e.target === icon || e.target === colorIndicator) {
          selectNode(nodeId);
        }
      };
      
      treeNode.appendChild(treeItem);
      
      // Children container
      if (hasChildren) {
        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'tree-children';
        
        const isExpanded = expandedNodes.has(nodeId);
        childrenContainer.classList.add(isExpanded ? 'expanded' : 'collapsed');
        
        if (isExpanded) {
          // Render parameters first
          label.params.forEach((value, paramName) => {
            const paramItem = createParameterItem(nodePath, paramName, value, level + 1, treeNode);
            childrenContainer.appendChild(paramItem);
          });
          
          // Then render sublabels
          renderTreeLevel(label.sublabels, nodePath, level + 1, childrenContainer);
        }
        
        treeNode.appendChild(childrenContainer);
      }
      
      container.appendChild(treeNode);
    });
  }

  function createParameterItem(labelPath, paramName, paramValue, level, treeNode) {
    const paramNode = document.createElement('div');
    paramNode.className = 'tree-node';
    
    const paramItem = document.createElement('div');
    paramItem.className = `tree-item level-${level}`;
    
    // Empty expand button for alignment
    const expandBtn = document.createElement('button');
    expandBtn.className = 'tree-expand-btn no-children';
    
    // Parameter icon
    const icon = document.createElement('div');
    icon.className = 'tree-icon param';
    
    // Parameter name
    const paramText = document.createElement('div');
    paramText.className = 'tree-label';
    paramText.textContent = paramName;
    
    // Parameter value
    const paramValueSpan = document.createElement('div');
    paramValueSpan.className = 'tree-param-value';
    paramValueSpan.textContent = `${paramValue.type} ${paramValue.default}` || '(empty)';
    
    // Actions
    const actions = document.createElement('div');
    actions.className = 'tree-actions';
    
    const editBtn = document.createElement('button');
    editBtn.className = 'tree-action-btn edit';
    editBtn.title = 'Edit parameter';
    editBtn.onclick = (e) => {
      e.stopPropagation();
      promptEditParameter(labelPath, paramName, paramValue, treeNode);
    };
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'tree-action-btn delete';
    deleteBtn.title = 'Delete parameter';
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      if (confirm(`Delete parameter "${paramName}"?`)) {
        deleteParameter(labelPath, paramName);
      }
    };
    
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    
    paramItem.appendChild(expandBtn);
    paramItem.appendChild(icon);
    paramItem.appendChild(paramText);
    paramItem.appendChild(paramValueSpan);
    paramItem.appendChild(actions);
    
    paramNode.appendChild(paramItem);
    return paramNode;
  }

  function toggleNode(nodeId) {
    if (expandedNodes.has(nodeId)) {
      expandedNodes.delete(nodeId);
    } else {
      expandedNodes.add(nodeId);
    }
    renderTree();
  }

  function selectNode(nodeId) {
    selectedNode = nodeId;
    renderTree();
  }

  // ======= User Interaction Prompts =======

  function promptAddSublabel(parentPath, container) {
    // Create inline input row
    const inlineEditor = document.createElement("div");
    inlineEditor.className = "inline-editor";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Sublabel name";

    const saveBtn = document.createElement("button");
    saveBtn.textContent = "Save";
    saveBtn.className = "save-btn green";

    // Handle save
    saveBtn.onclick = () => {
        const name = input.value.trim();
        if (!name) return;

        const color = generateRandomColor();
        if (addLabel(name, color, parentPath)) {
        inlineEditor.remove(); // remove editor
        // Expand parent node
        const parentNodeId = parentPath.join(".");
        expandedNodes.add(parentNodeId);
        renderTree();
        }
    };

    inlineEditor.appendChild(input);
    inlineEditor.appendChild(saveBtn);

    // Insert inline editor below the parent node
    container.appendChild(inlineEditor);
    input.focus();
    }


  function promptAddParameter(labelPath, container) {
  const inlineEditor = document.createElement("div");
  inlineEditor.className = "inline-editor";

  // Name
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.placeholder = "Parameter name";

  // Type selector
  const typeSelect = document.createElement("select");
  ["string", "dropdown", "checkbox"].forEach(t => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    typeSelect.appendChild(opt);
  });

  // Dynamic default value container
  const defaultValueContainer = document.createElement("div");
  defaultValueContainer.className = "default-value-container";

  // Dropdown values section
  const dropdownSection = document.createElement("div");
  dropdownSection.className = "dropdown-section hidden";

  const valuesList = document.createElement("div");
  valuesList.className = "dropdown-values";

  const addValueBtn = document.createElement("button");
  addValueBtn.textContent = "+ Add option";
  addValueBtn.type = "button";
  addValueBtn.onclick = () => {
    const itemInput = document.createElement("input");
    itemInput.type = "text";
    itemInput.placeholder = "Option";
    valuesList.appendChild(itemInput);
  };

  dropdownSection.appendChild(addValueBtn);
  dropdownSection.appendChild(valuesList);

  // Render default value input depending on type
  function renderDefaultInput(type, options = []) {
    defaultValueContainer.innerHTML = "";

    if (type === "string") {
      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = "Default value";
      defaultValueContainer.appendChild(input);
    } else if (type === "checkbox") {
      const input = document.createElement("input");
      input.type = "checkbox";
      defaultValueContainer.appendChild(input);
    } else if (type === "dropdown") {
        // No default value input for dropdown anymore
        }
  }

  // Initial default input
  renderDefaultInput("string");

  // Show/hide dropdown section + change default input
  typeSelect.onchange = () => {
    if (typeSelect.value === "dropdown") {
      dropdownSection.classList.remove("hidden");
      renderDefaultInput("dropdown", Array.from(valuesList.querySelectorAll("input")).map(i => i.value.trim()).filter(v => v));
    } else if (typeSelect.value === "checkbox") {
      dropdownSection.classList.add("hidden");
      renderDefaultInput("checkbox");
    } else {
      dropdownSection.classList.add("hidden");
      renderDefaultInput("string");
    }
  };

  // Save button
  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save";
  saveBtn.className = "save-btn green";

  saveBtn.onclick = () => {
    const paramName = nameInput.value.trim();
    if (!paramName) return;

    const paramType = typeSelect.value;
    let paramValue;

    if (paramType === "dropdown") {
      const items = Array.from(valuesList.querySelectorAll("input"))
        .map(i => i.value.trim())
        .filter(v => v);

      const selectEl = defaultValueContainer.querySelector("select");
      paramValue = { type: "dropdown", options: items, default: items.length > 0 ? items[0] : "" };
    } else if (paramType === "checkbox") {
      const checkboxEl = defaultValueContainer.querySelector("input[type='checkbox']");
      paramValue = { type: "checkbox", default: checkboxEl && checkboxEl.checked };
    } else {
      const inputEl = defaultValueContainer.querySelector("input[type='text']");
      paramValue = { type: "string", default: inputEl ? inputEl.value.trim() : "" };
    }

    addParameter(labelPath, paramName, paramValue);
    inlineEditor.remove();
    const nodeId = labelPath.join(".");
    expandedNodes.add(nodeId);
    renderTree();
  };

  inlineEditor.appendChild(nameInput);
  inlineEditor.appendChild(typeSelect);
  inlineEditor.appendChild(dropdownSection);
  inlineEditor.appendChild(defaultValueContainer);
  inlineEditor.appendChild(saveBtn);

  container.appendChild(inlineEditor);
  nameInput.focus();
}


function promptEditParameter(labelPath, oldParamName, oldParamValue, container) {
  if (!container) {
    console.error("Container is undefined or null!");
    return;
  }

  const inlineEditor = document.createElement("div");
  inlineEditor.className = "inline-editor";

  // Extract type/value
  let paramType = "string";
  let defaultVal = "";
  let options = [];

  if (typeof oldParamValue === "object" && oldParamValue.type) {
    paramType = oldParamValue.type;
    defaultVal = oldParamValue.default || "";
    options = oldParamValue.options || [];
  } else {
    defaultVal = oldParamValue || "";
  }

  // Name
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.value = oldParamName;
  nameInput.placeholder = "Parameter name";

  // Type selector
  const typeSelect = document.createElement("select");
  ["string", "dropdown", "checkbox"].forEach(t => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    if (t === paramType) opt.selected = true;
    typeSelect.appendChild(opt);
  });

  // Dynamic default value container
  const defaultValueContainer = document.createElement("div");
  defaultValueContainer.className = "default-value-container";

  // Dropdown values section
  const dropdownSection = document.createElement("div");
  dropdownSection.className = "dropdown-section" + (paramType === "dropdown" ? "" : " hidden");

  const valuesList = document.createElement("div");
  valuesList.className = "dropdown-values";

  options.forEach(optVal => {
    const itemInput = document.createElement("input");
    itemInput.type = "text";
    itemInput.value = optVal;
    valuesList.appendChild(itemInput);
  });

  const addValueBtn = document.createElement("button");
  addValueBtn.textContent = "+ Add option";
  addValueBtn.type = "button";
  addValueBtn.onclick = () => {
    const itemInput = document.createElement("input");
    itemInput.type = "text";
    itemInput.placeholder = "Option";
    valuesList.appendChild(itemInput);
  };

  dropdownSection.appendChild(addValueBtn);
  dropdownSection.appendChild(valuesList);

  // Render default value input depending on type
  function renderDefaultInput(type, options = [], current = "") {
    defaultValueContainer.innerHTML = "";

    if (type === "string") {
      const input = document.createElement("input");
      input.type = "text";
      input.value = current;
      input.placeholder = "Default value";
      defaultValueContainer.appendChild(input);
    } else if (type === "checkbox") {
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = current === true || current === "true";
      defaultValueContainer.appendChild(input);
    } else if (type === "dropdown") {
        // No default value input for dropdown anymore
        }
  }

  renderDefaultInput(paramType, options, defaultVal);

  // Show/hide on type change
  typeSelect.onchange = () => {
    if (typeSelect.value === "dropdown") {
      dropdownSection.classList.remove("hidden");
      const items = Array.from(valuesList.querySelectorAll("input")).map(i => i.value.trim()).filter(v => v);
      renderDefaultInput("dropdown", items, "");
    } else if (typeSelect.value === "checkbox") {
      dropdownSection.classList.add("hidden");
      renderDefaultInput("checkbox", [], false);
    } else {
      dropdownSection.classList.add("hidden");
      renderDefaultInput("string", [], "");
    }
  };

  // Save button
  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save";
  saveBtn.className = "save-btn green";

  saveBtn.onclick = () => {
    const newParamName = nameInput.value.trim();
    if (!newParamName) return;

    const newType = typeSelect.value;
    let newParamValue;

    if (newType === "dropdown") {
      const items = Array.from(valuesList.querySelectorAll("input"))
        .map(i => i.value.trim())
        .filter(v => v);
      const selectEl = defaultValueContainer.querySelector("select");
      newParamValue = { type: "dropdown", options: items, default: items.length > 0 ? items[0] : "" };
    } else if (newType === "checkbox") {
      const checkboxEl = defaultValueContainer.querySelector("input[type='checkbox']");
      newParamValue = { type: "checkbox", default: checkboxEl && checkboxEl.checked };
    } else {
      const inputEl = defaultValueContainer.querySelector("input[type='text']");
      newParamValue = { type: "string", default: inputEl ? inputEl.value.trim() : "" };
    }

    const label = getLabelByPath(labelPath);
    if (label) {
      if (newParamName !== oldParamName) {
        label.params.delete(oldParamName);
      }
      label.params.set(newParamName, newParamValue);
      inlineEditor.remove();
      refreshTreeUI();
    }
  };

  inlineEditor.appendChild(nameInput);
  inlineEditor.appendChild(typeSelect);
  inlineEditor.appendChild(dropdownSection);
  inlineEditor.appendChild(defaultValueContainer);
  inlineEditor.appendChild(saveBtn);

  container.appendChild(inlineEditor);
  nameInput.focus();
}




  // ======= Parameter Menu for Labeled Text =======
function showParameterMenu(labelElement, x, y) {
  hideContextMenu();
  hideParameterMenu();

  currentParamElement = labelElement;

  const labelName = labelElement.getAttribute("labelName");
  const parent = labelElement.getAttribute("parent");

  if (!labelName) return;

  const path = parent ? [parent, labelName] : [labelName];
  const labelData = getLabelByPath(path);

  if (!labelData || labelData.params.size === 0) {
    alert("This label has no parameters to edit");
    return;
  }

  elements.paramMenuTitle.textContent = `Edit Parameters - ${labelName}`;
  elements.paramForm.innerHTML = "";

  // Create inputs depending on param type
  labelData.params.forEach((paramDef, paramName) => {

    const paramRow = document.createElement("div");
    paramRow.className = "param-row";

    const label = document.createElement("label");
    label.textContent = paramName + ":";

    let input;

    if (typeof paramDef === "object" && paramDef.type) {
      const type = paramDef.type;
      const currentVal = labelElement.getAttribute(paramName) ?? paramDef.default ?? "";



      if (type === "string") {
        input = document.createElement("input");
        input.type = "text";
        input.value = currentVal;
      } else if (type === "checkbox") {
        input = document.createElement("input");
        input.type = "checkbox";
        input.checked = currentVal === true || currentVal === "true";
      } else if (type === "dropdown") {
        input = document.createElement("select");
        (paramDef.options || []).forEach((optVal) => {
          const opt = document.createElement("option");
          opt.value = optVal;
          opt.textContent = optVal;
          if (optVal === currentVal) opt.selected = true;
          input.appendChild(opt);
        });
      }
    } else {
      // Fallback: treat as string
      input = document.createElement("input");
      input.type = "text";
      input.value = labelElement.getAttribute(paramName) || paramDef || "";
    }

    input.dataset.paramName = paramName;

    paramRow.appendChild(label);
    paramRow.appendChild(input);
    elements.paramForm.appendChild(paramRow);
  });

  // Position menu
  const menuWidth = 250;
  const menuHeight = 200;

  x = Math.min(x, window.innerWidth - menuWidth - 10);
  y = Math.min(y, window.innerHeight - menuHeight - 10);

  elements.paramMenu.style.left = `${x}px`;
  elements.paramMenu.style.top = `${y}px`;
  elements.paramMenu.classList.remove("hidden");
}


  function hideParameterMenu() {
    elements.paramMenu.classList.add('hidden');
    currentParamElement = null;
  }

  function saveParameters() {
  if (!currentParamElement) return;

  // Grab every element we created in the param form (inputs and selects),
  // they all have data-param-name set in showParameterMenu()
  const elems = elements.paramForm.querySelectorAll('[data-param-name]');

  elems.forEach(el => {
    const paramName = el.dataset.paramName;
    let paramValue = '';

    // checkbox (input[type="checkbox"])
    if (el.tagName.toLowerCase() === 'input' && el.type === 'checkbox') {
      paramValue = el.checked ? 'true' : 'false';
    }
    // select (dropdown)
    else if (el.tagName.toLowerCase() === 'select') {
      paramValue = el.value ?? '';
    }
    // other inputs (text, number, etc.)
    else if (el.tagName.toLowerCase() === 'input') {
      paramValue = el.value ?? '';
    }
    // fallback
    else {
      paramValue = el.value ?? '';
    }

    // Store the actual value for this mention as an attribute (string)
    // (preserving case of paramName)
    currentParamElement.setAttribute(paramName, paramValue);
  });

  // Rebuild currentHtml from the editable HTML content (keeps your existing approach)
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = elements.htmlContent.innerHTML;

  const parser = new DOMParser();
  const doc = parser.parseFromString(currentHtml, 'text/html');
  doc.body.innerHTML = tempDiv.innerHTML;
  currentHtml = doc.documentElement.outerHTML;

  hideParameterMenu();
  updateStats();
}


  // ======= Label Options for Context Menu =======

  function getAllLabelsRecursive(labelMap, prefix = []) {
    const result = [];
    labelMap.forEach((label, name) => {
      const fullPath = [...prefix, name];
      const displayName = fullPath.join(' > ');
      result.push({ path: fullPath, label, displayName });

      // Recurse into sublabels
      const sub = getAllLabelsRecursive(label.sublabels, fullPath);
      result.push(...sub);
    });
    return result;
  }

  function updateLabelOptions() {
    elements.labelOptions.innerHTML = "";

    const allLabels = getAllLabelsRecursive(labels);

    if (allLabels.length === 0) {
      const noLabels = document.createElement("div");
      noLabels.className = "no-labels";
      noLabels.textContent = "No labels defined";
      elements.labelOptions.appendChild(noLabels);
      return;
    }

    allLabels.forEach(({ path, label, displayName }) => {
      const option = document.createElement("button");
      option.className = "label-option";
      option.textContent = displayName;
      option.style.backgroundColor = label.color;
      option.style.color = getContrastColor(label.color);

      option.onclick = (e) => {
        e.stopPropagation();
        applyLabelToSelection(path, label);
      };

      elements.labelOptions.appendChild(option);
    });
  }

  // ======= HTML Processing =======
  function extractExistingLabels(htmlString) {
    labels.clear(); // Clear previous state on fresh import
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const allMentions = Array.from(doc.querySelectorAll('manual_label'));

    // We'll index by label name for easy lookups
    const tempMap = new Map();

    // First pass: create all label objects
    for (const mention of allMentions) {
        const labelName = mention.getAttribute('labelName');
        if (!labelName) continue;

        // Get the color as above:
        let color = mention.getAttribute('color');
        if (!color) {
            const styleString = mention.getAttribute('style') || '';
            const m = styleString.match(/background-color:\s*([^;]+);?/i);
            if (m) {
                color = m[1].trim();
            }
        }
        if (!color) {
            color = generateRandomColor();
        }

        const params = {};
        // All attributes, except reserved ones, are parameters:
        for (const attr of mention.getAttributeNames()) {
            const lower = attr.toLowerCase();
            if (
                lower !== 'labelname' &&
                lower !== 'parent' &&
                lower !== 'style' &&
                lower !== 'class' &&
                lower !== 'color'
            ) {
                params[attr] = mention.getAttribute(attr);
            }
        }

        // Create label object (as in your createLabel)
        if (!tempMap.has(labelName)) {
            tempMap.set(labelName, {
                name: labelName,
                color: color,
                type: "structured",
                params: new Map(Object.entries(params)),
                sublabels: new Map(),
                parent: mention.getAttribute('parent') || "",
            });
        } else {
            // If label already seen, possibly merge in new params (your choice)
            const existing = tempMap.get(labelName);
            Object.entries(params).forEach(([k, v]) => existing.params.set(k, v));
        }
    }

    // Second pass: reconstruct tree structure
    tempMap.forEach((labelObj, name) => {
        const parentName = labelObj.parent;
        if (parentName && tempMap.has(parentName)) {
            // Insert as sublabel to parent
            tempMap.get(parentName).sublabels.set(name, labelObj);
        }
    });

    // Only add labels with no parent to the main labels map (roots)
    labels.clear();
    tempMap.forEach(labelObj => {
        if (!labelObj.parent) {
            labels.set(labelObj.name, labelObj);
        }
    });

    refreshTreeUI(); // Update UI after loading
  }

  function renderHtmlContent() {
    if (!currentHtml) {
      elements.htmlContent.innerHTML = `
        <div class="empty-state">
          <h3>No HTML loaded</h3>
          <p>Upload an HTML file to start labeling</p>
        </div>
      `;
      // Update filename display
      if (elements.currentFilename) {
        elements.currentFilename.textContent = '';
      }
      return;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(currentHtml, 'text/html');

    const mentions = doc.querySelectorAll('manual_label');

    mentions.forEach(mention => {
      const labelName = mention.getAttributeNames()[0];
      const labelData = getLabelByPath([labelName]);
      if (labelData) {
        mention.style.backgroundColor = labelData.color;
        mention.style.color = getContrastColor(labelData.color);
      }

      if (!mention.querySelector('.delete-btn')) {
        const deleteBtn = doc.createElement("button");
        deleteBtn.className = "delete-btn";
        deleteBtn.textContent = "×";
        mention.appendChild(deleteBtn);
      }
    });

    elements.htmlContent.innerHTML = doc.body.innerHTML;
    
    // Update filename display
    if (elements.currentFilename) {
      elements.currentFilename.textContent = currentFileName || '';
    }
    
    attachLabelEventListeners();
    updateStats();
  }

  function attachLabelEventListeners() {
    const labelElements = elements.htmlContent.querySelectorAll('manual_label');
    labelElements.forEach(labelElement => {
      const deleteBtn = labelElement.querySelector('.delete-btn');
      if (deleteBtn) {
        deleteBtn.onclick = (e) => {
          e.stopPropagation();
          let fullText = '';
          for (const child of labelElement.childNodes) {
            if (child.nodeType === Node.ELEMENT_NODE && child.classList.contains('delete-btn')) {
              continue;
            }
            fullText += child.textContent;
          }
          const textNode = document.createTextNode(fullText.trim());

          if (labelElement.parentNode) {
            labelElement.parentNode.replaceChild(textNode, labelElement);
          } else {
            elements.htmlContent.innerHTML = '';
          }

          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = elements.htmlContent.innerHTML;
          const parser = new DOMParser();
          const doc = parser.parseFromString(currentHtml, 'text/html');
          doc.body.innerHTML = tempDiv.innerHTML;
          currentHtml = doc.documentElement.outerHTML;

          attachLabelEventListeners();
          updateStats();
        };
      }

      // Click to edit parameters
      labelElement.onclick = (e) => {
        // Don't trigger if clicking delete button
        if (e.target.classList.contains('delete-btn')) return;

        // If there was a selection, do NOT open parameter menu!
        const sel = window.getSelection();
        if (!sel.isCollapsed) return;
        
        e.stopPropagation();
        showParameterMenu(labelElement, e.clientX, e.clientY);
      };
    });
  }

  function updateStats() {
    const manualLabels = elements.htmlContent.querySelectorAll('manual_label');
    elements.totalMentions.textContent = manualLabels.length;
    
    // Count total label types (including sublabels)
    let totalLabelTypes = 0;
    function countLabelsRecursive(labelMap) {
      labelMap.forEach((label) => {
        totalLabelTypes++;
        countLabelsRecursive(label.sublabels);
      });
    }
    countLabelsRecursive(labels);
    elements.labelTypes.textContent = totalLabelTypes;
  }

  // ======= Selection and Labeling =======
  function showContextMenu(x, y) {
    hideParameterMenu();
    
    const menuWidth = 200;
    const menuHeight = 150;
    
    x = Math.min(x, window.innerWidth - menuWidth - 10);
    y = Math.min(y, window.innerHeight - menuHeight - 10);
    
    elements.contextMenu.style.left = `${x}px`;
    elements.contextMenu.style.top = `${y}px`;
    elements.contextMenu.classList.remove('hidden');
  }

  function hideContextMenu() {
    elements.contextMenu.classList.add('hidden');
  }

  function applyLabelToSelection(labelPath, labelData) {
    if (!currentSelection || !currentSelection.range) return;

    hideContextMenu();

    try {
      const range = currentSelection.range;
      const selectedText = range.toString().trim();
      if (!selectedText) return;

      const labelElement = document.createElement("manual_label");

      // Always set label name
      labelElement.setAttribute("labelName", labelPath[labelPath.length - 1]);
      
      // Set parent attribute
      if (labelPath.length > 1) {
        labelElement.setAttribute("parent", labelPath[labelPath.length - 2]); // parent label
      } else {
        labelElement.setAttribute("parent", "");
      }

      // Apply parameters as attributes (preserving case)
      labelData.params.forEach((paramDef, paramName) => {
        let initialValue = "";

        if (typeof paramDef === "object" && paramDef.type) {
            initialValue = paramDef.default ?? "";
        } else {
            initialValue = paramDef;
        }

        labelElement.setAttribute(paramName, initialValue);
        });
      
      labelElement.style.backgroundColor = labelData.color;
      labelElement.style.color = getContrastColor(labelData.color);
      labelElement.textContent = selectedText;

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "delete-btn";
      deleteBtn.textContent = "×";
      labelElement.appendChild(deleteBtn);

      range.deleteContents();
      range.insertNode(labelElement);

      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = elements.htmlContent.innerHTML;
      const parser = new DOMParser();
      const doc = parser.parseFromString(currentHtml, "text/html");
      doc.body.innerHTML = tempDiv.innerHTML;
      currentHtml = doc.documentElement.outerHTML;

      window.getSelection().removeAllRanges();
      
      // Reattach event listeners
      attachLabelEventListeners();
      updateStats();

    } catch (error) {
      console.error("Error applying label:", error);
      alert("Error applying label. Please try selecting text again.");
    }

    currentSelection = null;
  }

  // ======= Event Listeners =======
  
  // File loading
  elements.htmlFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      currentHtml = await readFileAsText(file);
      currentFileName = file.name;
      
      extractExistingLabels(currentHtml);
      renderHtmlContent();
      elements.downloadBtn.disabled = false;
      
    } catch (error) {
      alert('Error reading HTML file');
      console.error(error);
    }
  });

  // Download
  elements.downloadBtn.addEventListener('click', () => {
    if (!currentHtml) return;

    const parser = new DOMParser();
    const doc = parser.parseFromString(currentHtml, 'text/html');
    
    const deleteButtons = doc.querySelectorAll('.delete-btn');
    deleteButtons.forEach(button => {
      button.remove();
    });

    const finalHtml = doc.documentElement.outerHTML;

    const blob = new Blob([finalHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFileName || 'labeled.html';
    a.click();
    URL.revokeObjectURL(url);
  });

  // Clear all
  elements.clearBtn.addEventListener('click', () => {
    if (confirm('Clear all content and labels?')) {
      currentHtml = '';
      currentFileName = '';
      labels.clear();
      expandedNodes.clear();
      selectedNode = null;
      renderHtmlContent();
      refreshTreeUI();
      elements.downloadBtn.disabled = true;
    }
  });

  // Add root label
  elements.addRootLabel.addEventListener('click', () => {
    const name = elements.newLabelName.value.trim();
    const color = elements.newLabelColor.value;
    
    if (addLabel(name, color)) {
      elements.newLabelName.value = '';
      elements.newLabelColor.value = generateRandomColor();
    }
  });

  // Enter key for adding labels
  elements.newLabelName.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      elements.addRootLabel.click();
    }
  });

  // Parameter menu event listeners
  elements.saveParams.addEventListener('click', saveParameters);
  elements.cancelParams.addEventListener('click', hideParameterMenu);

  // Text selection handling
  document.addEventListener('mouseup', (e) => {
    if (elements.contextMenu.contains(e.target) || elements.paramMenu.contains(e.target)) return;
    
    const selection = window.getSelection();
    
    if (!selection.isCollapsed && selection.toString().trim()) {
      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;
      const htmlContentElement = elements.htmlContent;
      
      if (htmlContentElement.contains(container) || htmlContentElement === container) {
        currentSelection = {
          text: selection.toString().trim(),
          range: range.cloneRange()
        };
        
        showContextMenu(e.clientX, e.clientY);
        return;
      }
    }
    
    hideContextMenu();
    hideParameterMenu();
  });

  // Hide menus when clicking elsewhere
  document.addEventListener('mousedown', (e) => {
    if (!elements.contextMenu.contains(e.target)) {
      hideContextMenu();
    }
    if (!elements.paramMenu.contains(e.target)) {
      hideParameterMenu();
    }
  });

  // Hide menus on escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideContextMenu();
      hideParameterMenu();
    }
  });

  // Prevent menus from closing when clicking inside
  elements.contextMenu.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  elements.paramMenu.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  // ======= Initialize =======
  elements.newLabelColor.value = generateRandomColor();
  refreshTreeUI();
  console.log('Enhanced HTML Labelizer ready!');
})();