var g_popoutElementVisible = undefined;

function getMousePos(evt, canvas)
{
	var rect = canvas.getBoundingClientRect();

	return	{
				x: (evt.clientX - rect.left),
				y: (evt.clientY - rect.top)
			};
}

// From http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
function componentToHex(c) 
{
	c = Math.floor(Math.max(0, Math.min(255, c)));
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function rgb2hex(r, g, b) 
{
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function rgba2html(r, g, b, a) 
{
    return "rgba(" + r + ", " + g + ", " + b + ", " + a + ")";
}

function parseColor(colorStr) 
{
	// From https://stackoverflow.com/questions/11068240/what-is-the-most-efficient-way-to-parse-a-css-color-in-javascript
	if (colorStr.substr(0,1)=="#") 
	{
		var collen = (colorStr.length-1)/3;

		var factors = [17,1,0.062272][collen-1];

		return {
					r: Math.round(parseInt(colorStr.substr(1, collen), 16) * factors),
					g: Math.round(parseInt(colorStr.substr(1+collen, collen), 16 ) * factors),
					b: Math.round(parseInt(colorStr.substr(1+2*collen, collen), 16) * factors)
				};
	}
	else
	{
		var rgb = colorStr.split("(")[1].split(")")[0].split(",").map(Math.round);

		return { r: rgb[0], g: rgb[1], b: rgb[2], a: rgb.length==4 ? rgb[3] : undefined };
	}
}

function ShortcutSystem()
{
	this.shortcuts = [];

	this.onKeyDown = function(evt)
	{
		var shortcut = (evt.ctrlKey ? "ctrl+":"") + (evt.altKey ? "alt+":"") + (evt.shiftKey? "shift+":"") + evt.key;

		shortcut = shortcut.toLowerCase();

		var callbacks = this.shortcuts[shortcut];

		if (callbacks != undefined && callbacks.length>0)
		{
			for (var i=0; i!=callbacks.length; ++i)
			{
				callbacks[i]();
			}

			evt.preventDefault();
		}
	}

	this.addShortcut = function(shortcutString, callback)
	{
		shortcutString = shortcutString.replace(/\s/g, "").toLowerCase();

		if (this.shortcuts.indexOf(shortcutString)<0)
		{
			this.shortcuts[shortcutString] = [];
		}

		this.shortcuts[shortcutString].push(callback);
	}
};

var g_shortcutSystem = new ShortcutSystem();

function Slider(minVal, maxVal, initialVal, stepVal, callback)
{
	var currentValue = initialVal;
	var inputNode;
	var editBox;
	var textLabel;

	this.updateValue = function()
	{
		currentValue = inputNode.value * stepVal;

		textLabel.innerHTML = currentValue.toFixed(2);

		editBox.value = currentValue;
		//editBox.nodeValue = currentValue;

		if (callback !== undefined)
			callback(currentValue);
	}

	this.showEditBox = function()
	{
		textLabel.style.display = "none";
		editBox.style.display = "inline";
	}

	this.hideEditBox = function()
	{
		textLabel.style.display = "inline";
		editBox.style.display = "none";

		currentValue = Math.max(minVal, Math.min(maxVal, editBox.valueAsNumber));
		inputNode.value = (currentValue / stepVal).toFixed(0);
		textLabel.innerHTML = currentValue.toFixed(2);

		this.updateValue();
	}

	this.editBoxKeyPress = function(evt)
	{
		if (evt.keyCode === 13)
		{
			evt.preventDefault();
			this.hideEditBox();
		}
	}

	this.addControls = function (parentElement)
	{
		var div = document.createElement('span');
	
		div.className = "toolbar";

		textLabel = document.createElement('text');
		textLabel.className = "toolbar";
		textLabel.innerHTML = currentValue.toFixed(2);
		textLabel.style.display = "inline";
		textLabel.addEventListener('click', this.showEditBox.bind(this));

		editBox = document.createElement('input');
		editBox.className = "toolbar";
		editBox.type = "number";
		editBox.style.display = "none";
		editBox.style.width = 80;
		editBox.value = currentValue.toFixed(2);
		editBox.addEventListener('blur', this.hideEditBox.bind(this));
		editBox.addEventListener('keypress', this.editBoxKeyPress.bind(this));
	
		inputNode = document.createElement('input');
		inputNode.className = "toolbar";
		inputNode.min = minVal/stepVal;
		inputNode.max = maxVal/stepVal;
		inputNode.step = 1;
		inputNode.type = "range";
		inputNode.value = currentValue/stepVal;
		inputNode.oninput = this.updateValue.bind(this);
	
		div.appendChild(document.createTextNode(minVal + " "));
		div.appendChild(inputNode);
		div.appendChild(document.createTextNode(" " + maxVal + " : "));
		div.appendChild(textLabel);
		div.appendChild(editBox);

		parentElement.appendChild(div);
	}
}

function PopoutControl(popoutDirection)
{
	this.mainContainer;
	this.popoutContainer;
	this.timeout = undefined;
	this.preventHide = false;

	this.showPopout = function(show)
	{
		if (show == undefined || show)
		{
			var rect = this.mainContainer.getBoundingClientRect();

			var anchorPoint = [rect.left, rect.top, rect.right, rect.bottom];

			// Enable it off screen so that we get the correct dimensions below
			this.popoutContainer.style.display = "inline";
			this.popoutContainer.style.left = window.innerWidth + 100;

			var divRect = this.popoutContainer.getBoundingClientRect();
			var divWidth = divRect.right - divRect.left;
			var divHeight = divRect.bottom - divRect.top;

			var threshold = 50;

			if (popoutDirection == undefined) 
				popoutDirection = "bottom";

			if (popoutDirection == "right") // left edge
			{
				this.popoutContainer.style.left = anchorPoint[2] + 5;

				if ( (anchorPoint[1] + divHeight) >= window.innerHeight )
				{
					this.popoutContainer.style.top = anchorPoint[3] - divHeight;
				}
				else 
				{
					this.popoutContainer.style.top = anchorPoint[1];
				}
			}
			else if (popoutDirection == "left") // right edge
			{
				this.popoutContainer.style.left = anchorPoint[0] - divWidth - 5;

				if ( (anchorPoint[1] + divHeight) >= window.innerHeight )
				{
					this.popoutContainer.style.top = anchorPoint[3] - divHeight;
				}
				else 
				{
					this.popoutContainer.style.top = anchorPoint[1];
				}
			}
			else if (popoutDirection == "bottom") // top edge
			{
				this.popoutContainer.style.top = anchorPoint[3] + 7;

				if ( (anchorPoint[0] + divWidth) >= window.innerWidth )
				{
					this.popoutContainer.style.left = anchorPoint[2] - divWidth;
				}
				else
				{
					this.popoutContainer.style.left = Math.max(5, (anchorPoint[0] + anchorPoint[2]) * 0.5 - divWidth * 0.5);
				}
			}
			else if (popoutDirection == "top") // bottom edge
			{
				this.popoutContainer.style.top = anchorPoint[1] - divHeight - 5;

				if ( (anchorPoint[0] + divWidth) >= window.innerWidth )
				{
					this.popoutContainer.style.left = anchorPoint[2] - divWidth;
				}
				else
				{
					this.popoutContainer.style.left = anchorPoint[0];
				}
			}

			this.popoutContainer.style.display = "inline";

			if (g_popoutElementVisible != this.popoutContainer)
			{
				if (g_popoutElementVisible != undefined)
				{
					g_popoutElementVisible.showPopout(false);
				}
			}

			g_popoutElementVisible = this; 
		}
		else
		{
			this.popoutContainer.style.display = "none";

			if (g_popoutElementVisible == this)
			{
				g_popoutElementVisible = undefined;
			}
		}
	}

	this.hidePopout = function()
	{
		this.showPopout(false);
	}

	this.allowHide = function(allow)
	{
		clearTimeout(this.timeout);
		this.preventHide = !allow;

		console.log("preventHide = " + this.preventHide.toString());
	}

	this.init = function()
	{
		this.mainContainer = document.createElement('span');
		this.mainContainer.className = "toolbar link";

		this.mainContainer.onmouseenter = function() 
		//this.mainContainer.onclick = function() 
		{
			this.showPopout();
			clearTimeout(this.timeout);
		}.bind(this);

		this.mainContainer.onmouseleave = function()
		{
			if (!this.preventHide)
			{
				this.timeout = setTimeout( function()
				{
					this.hidePopout();
				}.bind(this), 300 );
			}

		}.bind(this);

		this.popoutContainer = document.createElement('div');
		this.popoutContainer.className = "toolbar";
		this.popoutContainer.style.display = "none";
		this.popoutContainer.style.position = "fixed";
		this.popoutContainer.style.padding = "4px";
		this.popoutContainer.style.border = "1px solid #DDDDDD";
		this.popoutContainer.style.boxShadow = "3px 3px 5px #999999";
		this.popoutContainer.onmouseenter = function()
		{
			clearTimeout(this.timeout);

		}.bind(this);

		this.popoutContainer.onmouseleave = function()
		{
			if (!this.preventHide)
			{
				this.timeout = setTimeout( function()
				{
					this.hidePopout();
				}.bind(this), 200 );
			}

		}.bind(this);

		window.addEventListener('keyup', function(event) 
			{
				if (!this.preventHide)
				{
					if (event.keyCode==27) // ESC
					{
						this.hidePopout();
					}
				}
			}.bind(this) );
	}

	this.addControls = function(parentElement)
	{
		parentElement.appendChild(this.mainContainer);
		parentElement.appendChild(this.popoutContainer);
	}

	this.init();
}

function PopoutSlider(minVal, maxVal, initialVal, stepVal, callback, popoutDirection)
{
	PopoutControl.call(this, popoutDirection);

	this.currentValue = initialVal;
	this.label;
	this.slider;
	this.editBox;

	this.updateValue = function(newValue, nocallback)
	{
		this.currentValue = newValue;

		this.label.innerHTML = this.currentValue.toFixed(2);
		this.editBox.value = this.currentValue.toFixed(2);
		this.slider.value  = this.currentValue / stepVal;

		if (nocallback==undefined && callback !== undefined)
			callback(this.currentValue);
	}

	this.init = function ()
	{
		this.label = document.createElement('span');
		this.label.className = "toolbar link";
		this.label.innerHTML = this.currentValue.toFixed(2);
		
		this.mainContainer.appendChild(this.label);

		this.slider = document.createElement('input');
		this.slider.className = "toolbar";
		this.slider.min = minVal/stepVal;
		this.slider.max = maxVal/stepVal;
		this.slider.step = 1;
		this.slider.type = "range";
		this.slider.value = this.currentValue/stepVal;
		this.slider.oninput = function()
		{
			this.updateValue(this.slider.value * stepVal);
		}.bind(this);
	
		this.editBox = document.createElement('input');
		this.editBox.className = "toolbar";
		this.editBox.type = "number";
		this.editBox.style.width = 80;
		this.editBox.value = this.currentValue.toFixed(2);

		this.editBox.onfocus = function()
		{
			this.allowHide(false);
		}.bind(this);

		this.editBox.onblur = function()
		{
			this.allowHide(true);
			this.updateValue(this.editBox.valueAsNumber);
		}.bind(this);

		this.editBox.onkeypress = function(evt)
		{
			if (evt.keyCode === 13)
			{
				//evt.preventDefault();
				this.updateValue(this.editBox.valueAsNumber);
				this.hidePopout();
			}
		}.bind(this);

		this.popoutContainer.appendChild(document.createTextNode(minVal + " "));
		this.popoutContainer.appendChild(this.slider);
		this.popoutContainer.appendChild(document.createTextNode(" " + maxVal));
		var spacerElement = document.createElement("span");
		spacerElement.className = "toolbar";
		spacerElement.style.margin = 4;
		this.popoutContainer.appendChild(spacerElement);

		this.popoutContainer.appendChild(this.editBox);

		this.updateValue(this.currentValue, true);
	}

	this.init();
}

function PopoutContainer(label, img, popoutDirection)
{
	PopoutControl.call(this, popoutDirection);

	this.label;
	this.labels		= [];
	this.controls	= [];

	this.addControl = function(label, control)
	{
		this.labels.push(label);
		this.controls.push(control);
	}

	this.baseAddControls = this.addControls;

	this.addControls = function(parentElement)
	{
		this.label = document.createElement('span');
		this.label.className = "toolbar link";
		
		if (label != undefined)
		{
			this.label.appendChild(document.createTextNode(label));
		}

		if (label != undefined && img != undefined)
		{
			var spacerElement = document.createElement("span");
			spacerElement.className = "toolbar";
			spacerElement.style.margin = 4;
			this.label.appendChild(spacerElement);
		}

		if (img != undefined)
		{
			var imgElement = document.createElement("img");
			imgElement.src = img;
			imgElement.width = 18;
			imgElement.height = 18;
			imgElement.style.verticalAlign = "middle";
			imgElement.className = "toolbar";

			this.label.appendChild(imgElement);
		}

		this.mainContainer.appendChild(this.label);

		for (var i=0; i!=this.controls.length; ++i)
		{
			var div = document.createElement("div");
			div.className = "MenuPopoutButtonEntry";
			div.style.display = "block";
			div.style.marginBottom = "4px";

			var labelElement = document.createElement("span");
			labelElement.className = "toolbar";

			var spacerElement = document.createElement("span");
			spacerElement.className = "toolbar";
			spacerElement.style.margin = "4px";

			var controlElement = document.createElement("span");
			controlElement.className = "toolbar";

			labelElement.innerHTML = this.labels[i];

			this.controls[i].addControls(controlElement);

			div.appendChild(labelElement);
			div.appendChild(spacerElement);
			div.appendChild(controlElement);
			
			this.popoutContainer.appendChild(div);
		}
	
		this.baseAddControls(parentElement);
	}
}

function LogSlider(minExponent, maxExponent, base, initialVal, stepVal, callback)
{
	var currentValue = initialVal;
	var currentExponent = Math.log10(initialVal) / Math.log10(base);
	var inputNode;
	var editBox;
	var textLabel;

	this.updateValue = function()
	{
		currentExponent = inputNode.value * stepVal;
		currentValue = Math.pow(base, currentExponent);
		textLabel.innerHTML = currentValue.toFixed(3);

		editBox.value = currentValue;

		if (callback !== undefined)
			callback(currentValue);
	}

	this.showEditBox = function()
	{
		textLabel.style.display = "none";
		editBox.style.display = "inline";
	}

	this.hideEditBox = function()
	{
		textLabel.style.display = "inline";
		editBox.style.display = "none";

		currentExponent = Math.log10(editBox.valueAsNumber) / Math.log10(base);
		currentExponent = Math.max(minExponent, Math.min(maxExponent, editBox.valueAsNumber));
		currentValue = Math.pow(base, currentExponent);

		inputNode.value = (currentValue / stepVal).toFixed(0);
		textLabel.innerHTML = currentValue.toFixed(2);

		this.updateValue();
	}

	this.editBoxKeyPress = function(evt)
	{
		if (evt.keyCode === 13)
		{
			evt.preventDefault();
			this.hideEditBox();
		}
	}

	this.addControls = function (parentElement)
	{
		var div = document.createElement('div');
	
		textLabel = document.createElement('text');
		textLabel.className = "toolbar";
		textLabel.innerHTML = currentValue.toFixed(2);
		textLabel.style.display = "inline";
		textLabel.addEventListener('click', this.showEditBox.bind(this));

		editBox = document.createElement('input');
		editBox.className = "toolbar";
		editBox.type = "number";
		editBox.style.display = "none";
		editBox.style.width = 80;
		editBox.value = currentValue.toFixed(2);
		editBox.addEventListener('blur', this.hideEditBox.bind(this));
		editBox.addEventListener('keypress', this.editBoxKeyPress.bind(this));
	
		inputNode = document.createElement('input');
		inputNode.className = "toolbar";
		inputNode.min = minExponent/stepVal;
		inputNode.max = maxExponent/stepVal;
		inputNode.step = 1;
		inputNode.type = "range";
		inputNode.value = currentExponent/stepVal;
		inputNode.oninput = this.updateValue.bind(this);
	
		div.appendChild(document.createTextNode(Math.pow(base, minExponent) + " "));
		div.appendChild(inputNode);
		div.appendChild(document.createTextNode(" " + Math.pow(base, maxExponent) + " : "));
		div.appendChild(textLabel);
		div.appendChild(editBox);

		parentElement.appendChild(div);
	}
}

function Dropdown(values, initialVal, callback)
{
	var currentValue = initialVal;
	var dropdown;

	function onChange()
	{
		currentValue = dropdown.selectedIndex;

		if (callback !== undefined)
			callback(currentValue);

		dropdown.blur();
	}

	this.addControls = function (parentElement)
	{
		dropdown = document.createElement('select');

		dropdown.className = "toolbar";		

		for (var i=0; i!=values.length; ++i)
		{
			var option = document.createElement('option');
			option.text = values[i];
			dropdown.options.add(option);

			if (currentValue == i)
				dropdown.selectedIndex = i;
		}

		dropdown.onchange = onChange;

		parentElement.appendChild(dropdown);
	}
}

function PlainButton(label, callback)
{
	this.addControls = function(parentElement)
	{
		var btn = document.createElement("BUTTON");
		btn.appendChild(document.createTextNode(label));
		btn.onclick = callback;
		btn.className = "toolbar";
		//btn.style.width = 165;
		//btn.style.height = 27;
		parentElement.appendChild(btn);
	}
}

function Button(imgSrc, sizeOverride, textLabel, hintText, callback, shortcut)
{
	this.btn = undefined;
	this.img = undefined;
	this.label = undefined;
	this.hintDiv = undefined;
	this.popoutTimeout = undefined;

	if (shortcut != undefined && callback != undefined)
	{
		if (Array.isArray(shortcut))
		{
			for (var s in shortcut)
			{
				g_shortcutSystem.addShortcut(shortcut[s], callback);
			}
		}
		else
		{
			g_shortcutSystem.addShortcut(shortcut, callback);
		}
	}

	this.getBoundingClientRect = function()
	{
		return this.btn.getBoundingClientRect();
	}

	this.addControls = function(parentElement)
	{
		this.btn = document.createElement("span");

		this.btn.className = "toolbar button";
		this.btn.style.padding = "2px 10px 2px 10px";
		this.btn.style.display = "flex";
		
		this.btn.onmouseenter = function() 
		{
			if (hintText)
			{
				var rect = this.btn.getBoundingClientRect();

				clearTimeout(this.popoutTimeout);

				if (this.hintDiv)
				{
					this.hintDiv.destroy();
					this.hintDiv = undefined;
				}

				this.popoutTimeout = setTimeout( function()
				{
					this.hintDiv = new ShowPopupHint([rect.left, rect.top, rect.right, rect.bottom], textLabel, hintText, parentElement);
				}.bind(this), 500 );
			}

		}.bind(this);
		
		this.btn.onmouseleave = function() 
		{
			if (this.popoutTimeout)
			{
				clearTimeout(this.popoutTimeout);
				this.popoutTimeout = undefined;
			}

			if (this.hintDiv)
			{
				this.hintDiv.destroy();
				this.hintDiv = undefined;
			}

		}.bind(this);

		this.btn.onclick = function()
		{
			callback();
		}

		if (imgSrc)
		{
			this.img = document.createElement("img");
			this.img.src = imgSrc;
			this.img.style.verticalAlign = "middle";

			if (sizeOverride != undefined)
			{
				this.img.width = sizeOverride[0];
				this.img.height = sizeOverride[1];
			}

			this.btn.appendChild(this.img);
		}

		if (textLabel)
		{
			this.label = document.createElement("span");

			if (shortcut != undefined)
			{
				if (Array.isArray(shortcut))
				{
					this.label.innerHTML = textLabel + " (";

					for (var i=0; i!=shortcut.length; ++i)
					{
						if (i==0)
							this.label.innerHTML += shortcut[i];
						else
							this.label.innerHTML += ", " + shortcut[i];
					}

					this.label.innerHTML += ")";
				}
				else
				{
					this.label.innerHTML = textLabel + " (" + shortcut + ")";
				}

				this.label.innerHTML = textLabel + " (" + shortcut + ")"; 
			}
			else
			{
				this.label.innerHTML = textLabel;
			}

			this.label.className = "buttonLabel";
			this.label.style.cursor = "default";
			
			if (imgSrc)
			{
				this.label.style.marginLeft = 15;
			}

			this.btn.appendChild(this.label);
		}
		else if (imgSrc)
		{
			//this.img.style.marginRight = 15;
		}


		parentElement.appendChild(this.btn);
	}
}

function TickBox(value, callback)
{
	var tickBox;
	var ticked = value;

	function onClick()
	{
		ticked = tickBox.checked;

		if (callback !== undefined)
		{
			callback(tickBox.checked);
		}
	}

	this.addControls = function(parentElement)
	{
		tickBox = document.createElement("INPUT");
		tickBox.className = "toolbar link";
		tickBox.setAttribute("type", "checkbox"); 
		tickBox.onclick = onClick;
		tickBox.checked = ticked;
		parentElement.appendChild(tickBox);
	}
}

function Tickbox(imgSrc, sizeOverride, textLabel, hintText, currentValue, callback, shortcut)
{
	this.btn = undefined;
	this.ticked = currentValue;

	this.getBoundingClientRect = function()
	{
		return this.btn.getBoundingClientRect();
	}

	this.toggle = function()
	{
		this.ticked = !this.ticked;
		this.updateButton();
		
		if (callback)
		{
			callback(this.ticked);
		}
	}

	this.updateButton = function()
	{		
		if (this.ticked)
		{
			this.btn.img.style.borderLeft = "2px solid #999999";
			this.btn.img.style.borderTop = "2px solid #999999";
			this.btn.img.style.borderRight = "2px solid #FFFFFF";
			this.btn.img.style.borderBottom = "2px solid #FFFFFF";
			this.btn.img.style.background = "#BBBBBB";
		}
		else
		{
			this.btn.img.style.borderLeft = "2px solid #FFFFFF";
			this.btn.img.style.borderTop = "2px solid #FFFFFF";
			this.btn.img.style.borderRight = "2px solid #999999";
			this.btn.img.style.borderBottom = "2px solid #999999";
			this.btn.img.style.background = "none";
		}
	}

	this.addControls = function(parentElement)
	{
		this.btn = new Button(imgSrc, sizeOverride, textLabel, hintText, this.toggle.bind(this), shortcut);
		this.btn.addControls(parentElement);
		this.updateButton();
	}
}

function ColorPicker(value, callback)
{
	var picker;
	var color = value;

	function onchange()
	{
		color = picker.value;

		if (callback !== undefined)
		{
			callback(color);
		}
	}

	this.addControls = function(parentElement)
	{
		picker = document.createElement("INPUT");
		picker.className = "toolbar";
		picker.setAttribute("type", "color"); 
		picker.onchange = onchange;
		picker.value = color;
		parentElement.appendChild(picker);
	}
}

function TextBox(value, singleLine, perKeyCallback, maxLength, callback)
{
	var textArea;
	var textValue;

	function onchange()
	{
		textValue = textArea.value;

		if (callback !== undefined)
		{
			callback(textValue);
		}
	}

	this.addControls = function(parentElement)
	{
		if (singleLine)
		{
			textArea = document.createElement('input');
			textArea.className = "toolbar";
			textArea.type = "text";
			textArea.value = value;
			textArea.onchange = onchange;
			textArea.maxLength = maxLength;
			textArea.onkeypress = function(e) 
				{
					var event = e || window.event;
					var charCode = event.which || event.keyCode;

					if (perKeyCallback || charCode == '13') 
					{
						onchange();
					}
				}
		}
		else
		{
			textArea = document.createElement("textarea");
			textArea.className = "toolbar";
			textArea.style.height = 25;
			textArea.style.width = 200;
			textArea.value = value;
			textArea.addEventListener('blur', onchange, false);

			if (perKeyCallback)
			{
				textArea.onkeydown = function(e) 
					{
						var event = e || window.event;
						var charCode = event.which || event.keyCode;

						onchange();
					}
			}
		}

		parentElement.appendChild(textArea);
	}
}

function PopoutTextBox(value, singleLine, perKeyCallback, maxLength, callback, popoutDirection)
{
	PopoutControl.call(this, popoutDirection);

	this.textArea;

	this.onchange = function()
	{
		this.textValue = this.textArea.value;

		if (callback !== undefined)
		{
			callback(this.textValue);
		}
	}

	this.init = function()
	{
		if (singleLine)
		{
			this.textArea = document.createElement('input');
			this.textArea.className = "toolbar";
			this.textArea.type = "text";
			this.textArea.value = value;
			this.textArea.onchange = this.onchange;
			this.textArea.maxLength = maxLength;
			this.textArea.onkeypress = function(e) 
				{
					var event = e || window.event;
					var charCode = event.which || event.keyCode;

					if (perKeyCallback || charCode == '13') 
					{
						this.onchange();
					}

					if (charCode == '13') 
					{
						this.hidePopout();
					}
				}
		}
		else
		{
			this.textArea = document.createElement("textarea");
			this.textArea.className = "toolbar";
			this.textArea.style.height = 300;
			this.textArea.style.width = 500;
			this.textArea.value = value;

			if (perKeyCallback)
			{
					this.textArea.onkeydown = function(e) 
					{
						var event = e || window.event;
						var charCode = event.which || event.keyCode;

						this.onchange();
					}
			}
		}

		this.textArea.onfocus = function()
		{
			this.allowHide(false);
		}.bind(this);

		this.textArea.onblur = function()
		{
			this.allowHide(true);
			this.onchange();
		}.bind(this);

		var img = document.createElement("img");
		img.src = "images/rename_drawing.svg";
		img.width = 18;
		img.height = 18;
		img.style.verticalAlign = "middle";
		img.className = "toolbar";

		this.mainContainer.appendChild(img);
		this.popoutContainer.appendChild(this.textArea);
	}

	this.init();
}

function Divider()
{
	this.addControls = function(parentElement)
	{
		var div = document.createElement("div");

		div.className = "toolbar";
		div.style.border = "1px solid #888888";
		div.style.margin = "2px 5px";

		parentElement.appendChild(div);
	}
}

function MultiToolButton(sizeOverride)
{
	this.buttons		= [];
	this.activeButton	= 0;
	this.buttonDiv		= undefined;
	this.expandButton	= undefined;
	this.popoutDiv		= undefined;
	this.popoutTimeout	= undefined;

	this.addButton = function(imgSrc, textLabel, hintText, callback)
	{
		this.buttons.push(new Button(imgSrc, sizeOverride, textLabel, hintText, callback));
	}

	this.makePopoutDiv = function()
	{
		if (this.popoutDiv == undefined)
		{
			this.popoutDiv = document.createElement("div");
		}
		else
		{
			while (this.popoutDiv.firstChild)
			{
				this.popoutDiv.removeChild(this.popoutDiv.firstChild);
			}
		}

		this.popoutDiv.className = "toolbar";
		this.popoutDiv.style.position = "fixed";
		this.popoutDiv.style.visibility = "hidden";
		this.popoutDiv.style.border = "1px solid black";
		this.popoutDiv.style.boxShadow = "3px 3px 5px #999999";
		this.popoutDiv.onmouseenter = function() { clearTimeout(this.popoutTimeout); this.popoutDiv.style.visibility = "visible"; }.bind(this);
		this.popoutDiv.onmouseleave = function() { this.popoutDiv.style.visibility = "hidden";  }.bind(this);
		this.popoutDiv.onclick		= function() { this.popoutDiv.style.visibility = "hidden";  }.bind(this);

		for (var i=0; i!=this.buttons.length; ++i)
		{
			if (i == this.activeButton)
				continue;

			var div = document.createElement("div");
			div.style.display = "block";
			
			(	function(_this, i)
				{
					div.onclick = function() 
						{
							_this.activeButton = i;
							_this.makePopoutDiv();
							_this.updateButton();
						};
				}
			)(this, i);


			this.buttons[i].addControls(div);
			this.popoutDiv.appendChild(div);
		}

		window.addEventListener('click', function(event) 
			{
				var rect = this.buttonDiv.getBoundingClientRect();
				var divRect = this.popoutDiv.getBoundingClientRect();
				if (event.x<divRect.left || event.x>divRect.right || event.y<divRect.top || event.y>divRect.bottom)
				{
					if (event.x<rect.left || event.x>rect.right || event.y<rect.top || event.y>rect.bottom)
					{
						this.popoutDiv.style.visibility = "hidden";
					}
				}
			}.bind(this) );

		window.addEventListener('keyup', function(event) 
			{
				if (event.keyCode==27) // ESC
				{
					this.popoutDiv.style.visibility = "hidden";
				}
			}.bind(this) );
	}

	this.showPopout = function(show)
	{
		if (show == undefined || show)
		{
			var rect = this.buttonDiv.getBoundingClientRect();
			var divRect = this.popoutDiv.getBoundingClientRect();
			
			var divWidth = divRect.right - divRect.left;
			var divHeight = divRect.bottom - divRect.top;

			if (rect.left <= 50) // left edge
			{
				this.popoutDiv.style.left = rect.right + 5;

				if ( (rect.top + divHeight) >= window.innerHeight )
				{
					this.popoutDiv.style.top = rect.bottom - divHeight;
				}
				else 
				{
					this.popoutDiv.style.top = rect.top;
				}
			}
			else if (rect.right >= (window.innerWidth - 50)) // right edge
			{
				this.popoutDiv.style.left = rect.left - divWidth - 5;

				if ( (rect.top + divHeight) >= window.innerHeight )
				{
					this.popoutDiv.style.top = rect.bottom - divHeight;
				}
				else 
				{
					this.popoutDiv.style.top = rect.top;
				}
			}
			else if (rect.top <= 50) // top edge
			{
				this.popoutDiv.style.top = rect.bottom + 5;

				if ( (rect.left + divWidth) >= window.innerWidth )
				{
					this.popoutDiv.style.left = rect.right - divWidth;
				}
				else
				{
					this.popoutDiv.style.left = rect.left;
				}
			}
			else if (rect.bottom >= (window.innerHeight - 50)) // bottom edge
			{
				this.popoutDiv.style.top = rect.top - divHeight - 5;

				if ( (rect.left + divWidth) >= window.innerWidth )
				{
					this.popoutDiv.style.left = rect.right - divWidth;
				}
				else
				{
					this.popoutDiv.style.left = rect.left;
				}
			}
			else // fallback
			{
				if ( (rect.left + divWidth) >= window.innerWidth )
				{
					this.popoutDiv.style.left = rect.right - divWidth;
				}
				else
				{
					this.popoutDiv.style.left = rect.left;
				}

				if ( (rect.top + divHeight) >= window.innerHeight )
				{
					this.popoutDiv.style.top = rect.top - divHeight;
				}
				else 
				{
					this.popoutDiv.style.top = rect.top;
				}
			}

			this.popoutDiv.style.visibility = "visible"; 

			divRect = this.popoutDiv.getBoundingClientRect();
			g_hintAvoidArea = [divRect.left, divRect.top, divRect.right, divRect.bottom];
		}
		else
		{
			g_hintAvoidArea = undefined;
			this.popoutDiv.style.visibility = "hidden"; 
		}
	}

	this.updateButton = function()
	{
		while (this.buttonDiv.firstChild)
		{
			this.buttonDiv.removeChild(this.buttonDiv.firstChild);
		}

		this.buttons[this.activeButton].addControls(this.buttonDiv);

		if (this.buttons[this.activeButton].label)
			this.buttonDiv.appendChild(this.expandButton);
	}

	this.addControls = function(parentElement)
	{
		this.makePopoutDiv();
		parentElement.appendChild(this.popoutDiv);

		this.expandButton = document.createElement("div"); 
		this.expandButton.id = "expand button";
		this.expandButton.style.position = "absolute";
		this.expandButton.style.right = 0;
		this.expandButton.style.top = 1;

		this.expandButton.innerHTML = "...&nbsp;";//<i class=\"material-icons\">keyboard_arrow_right</i>";

		this.buttonDiv = document.createElement("div");
		this.buttonDiv.style.position = "relative";
		this.buttonDiv.style.left = 0;
		this.buttonDiv.style.top = 0;
		this.buttonDiv.onmouseenter = function() { clearTimeout(this.popoutTimeout); this.popoutTimeout = setTimeout( function() { this.showPopout(true); }.bind(this), 200); }.bind(this);

		// Allow time for mouse to move out of button and onto popout
		this.buttonDiv.onmouseleave = function() { clearTimeout(this.popoutTimeout); this.popoutTimeout = setTimeout( function() { this.showPopout(false); }.bind(this), 100); }.bind(this);

		this.updateButton();

		parentElement.appendChild(this.buttonDiv);
	}
}


function MenuPopoutButton(imgSrc, sizeOverride, textLabel, popoutDirection)
{
	this.button		= undefined;
	this.labels		= [];
	this.controls	= [];
	this.popoutDiv	= undefined;
	this.popoutDirection = popoutDirection;

	this.addControl = function(label, control)
	{
		this.labels.push(label);
		this.controls.push(control);
	}

	this.makePopoutDiv = function()
	{
		this.popoutDiv = document.createElement("div");
		this.popoutDiv.className = "toolbar";
		this.popoutDiv.style.position = "fixed";
		this.popoutDiv.style.visibility = "hidden";
		this.popoutDiv.style.border = "1px solid #DDDDDD";
		this.popoutDiv.style.boxShadow = "3px 3px 5px #999999";
		this.popoutDiv.style.textAlign = "left";
		this.popoutDiv.style.left = 10;
		this.popoutDiv.style.top = 10;

		for (var i=0; i!=this.controls.length; ++i)
		{
			var div = document.createElement("div");
			div.className = "MenuPopoutButtonEntry";
			div.style.display = "block";

			var labelElement = document.createElement("span");
			labelElement.className = "toolbar";

			var spacerElement = document.createElement("span");
			spacerElement.className = "toolbar";
			spacerElement.style.margin = "4px";

			var controlElement = document.createElement("span");
			controlElement.className = "toolbar";

			labelElement.innerHTML = this.labels[i];

			this.controls[i].addControls(controlElement);

			div.appendChild(labelElement);
			div.appendChild(spacerElement);
			div.appendChild(controlElement);
			
			this.popoutDiv.appendChild(div);

			this.popoutDiv.onclick = function() 
				{ 
					this.showPopout(false); 
				}.bind(this);
		}

		window.addEventListener('click', function(event) 
			{
				if (this.popoutDiv.style.visibility != "hidden")
				{
					var rect = this.button.getBoundingClientRect();
					var divRect = this.popoutDiv.getBoundingClientRect();

					if (event.x<divRect.left || event.x>divRect.right || event.y<divRect.top || event.y>divRect.bottom)
					{
						if (event.x<rect.left || event.x>rect.right || event.y<rect.top || event.y>rect.bottom)
						{
							this.showPopout(false);
						}
					}
				}
			}.bind(this) );

		window.addEventListener('keyup', function(event) 
			{
				if (this.popoutDiv.style.visibility != "hidden")
				{
					if (event.keyCode==27) // ESC
					{
						this.showPopout(false);
					}
				}
			}.bind(this) );
	}

	this.showPopout = function(show)
	{
		if (show == undefined || show)
		{
			var rect = this.button.getBoundingClientRect();
			var divRect = this.popoutDiv.getBoundingClientRect();
			
			this.popoutDiv.style.visibility = "visible"; 
			this.setupPosition();
			g_popoutElementVisible = this;
		}
		else
		{
			this.popoutDiv.style.visibility = "hidden"; 
			if (g_popoutElementVisible == this)
			{
				g_popoutElementVisible = undefined;
			}
		}
	}

	this.setupPosition = function()
	{
		var rect = this.button.getBoundingClientRect();

		var anchorPoint = [rect.left, rect.top, rect.right, rect.bottom];

		var divRect = this.popoutDiv.getBoundingClientRect();
		var divWidth = divRect.right - divRect.left;
		var divHeight = divRect.bottom - divRect.top;

		var threshold = 50;

		if ((anchorPoint[0] <= threshold && this.popoutDirection == undefined) || this.popoutDirection == "right") // left edge
		{
			this.popoutDiv.style.left = anchorPoint[2] + 5;

			if ( (anchorPoint[1] + divHeight) >= window.innerHeight )
			{
				this.popoutDiv.style.top = anchorPoint[3] - divHeight;
			}
			else 
			{
				this.popoutDiv.style.top = anchorPoint[1];
			}
		}
		else if ((anchorPoint[2] >= (window.innerWidth - threshold) && this.popoutDirection == undefined)  || this.popoutDirection == "left") // right edge
		{
			this.popoutDiv.style.left = anchorPoint[0] - divWidth - 5;

			if ( (anchorPoint[1] + divHeight) >= window.innerHeight )
			{
				this.popoutDiv.style.top = anchorPoint[3] - divHeight;
			}
			else 
			{
				this.popoutDiv.style.top = anchorPoint[1];
			}
		}
		else if ((anchorPoint[1] <= threshold && this.popoutDirection == undefined)  || this.popoutDirection == "bottom") // top edge
		{
			this.popoutDiv.style.top = anchorPoint[3] + 5;

			if ( (anchorPoint[0] + divWidth) >= window.innerWidth )
			{
				this.popoutDiv.style.left = anchorPoint[2] - divWidth;
			}
			else
			{
				this.popoutDiv.style.left = anchorPoint[0];
			}
		}
		else if ((anchorPoint[3] >= (window.innerHeight - threshold) && this.popoutDirection == undefined)  || this.popoutDirection == "top") // bottom edge
		{
			this.popoutDiv.style.top = anchorPoint[1] - divHeight - 5;

			if ( (anchorPoint[0] + divWidth) >= window.innerWidth )
			{
				this.popoutDiv.style.left = anchorPoint[2] - divWidth;
			}
			else
			{
				this.popoutDiv.style.left = anchorPoint[0];
			}
		}
		else // fallback
		{
			if ( (anchorPoint[2] + divWidth) >= window.innerWidth )
			{
				this.popoutDiv.style.left = anchorPoint[0] - divWidth -5;
			}
			else
			{
				this.popoutDiv.style.left = anchorPoint[2] + 5;
			}

			if ( (anchorPoint[1] + divHeight) >= window.innerHeight )
			{
				this.popoutDiv.style.top = anchorPoint[1] - divHeight;
			}
			else 
			{
				this.popoutDiv.style.top = anchorPoint[1];
			}
		}
	}

	this.addControls = function(parentElement)
	{
		this.makePopoutDiv();
		parentElement.appendChild(this.popoutDiv);

		this.button = new Button(imgSrc, sizeOverride, textLabel, undefined, function() 
			{ 
				if (g_popoutElementVisible == undefined)
				{
					this.showPopout(true); 
				}
				else
				{
					g_popoutElementVisible.showPopout(false); 
				}
			}.bind(this));

		this.button.addControls(parentElement);

		this.button.btn.onmouseover = function()
		{
			if (g_popoutElementVisible != undefined)
			{
				g_popoutElementVisible.showPopout(false);
				this.showPopout(true);
			}
		}.bind(this);

		this.setupPosition();
	}
}

function Appearance(lineColor, lineAlpha, lineWidth, fillColor, fillAlpha)
{
	this.lineWidth		= 1;
	this.lineRGB		= [0,0,0];
	this.lineAlpha		= 1;
	this.lineDashIndex	= 0;
	this.fillRGB		= [127,127,127];
	this.fillAlpha		= 0;

	this.copy = function()
	{
		var copyObj = new Appearance();

		copyObj.lineWidth		= this.lineWidth;	
		copyObj.lineRGB			= this.lineRGB.slice(0);
		copyObj.lineAlpha		= this.lineAlpha;
		copyObj.lineDashIndex	= this.lineDashIndex;
		copyObj.fillRGB			= this.fillRGB.slice(0);
		copyObj.fillAlpha		= this.fillAlpha;

		return copyObj;
	}

	this.GetLineDash = function()
	{
		if (this.lineDashIndex == 0)
			return [];
		else
			return [this.lineDashIndex * 2 * this.lineWidth, this.lineDashIndex * 2 * this.lineWidth];
	}

	this.SetLineColor = function(hexColor)
	{
		var rgb = parseColor(hexColor);

		this.lineRGB[0] = rgb.r;
		this.lineRGB[1] = rgb.g;
		this.lineRGB[2] = rgb.b;

		if (rgb.a != undefined)
		{
			this.lineAlpha = rgb.a;
		}
	}

	this.GetLineColor = function()
	{
		return "rgba(" + this.lineRGB[0] + ", " + this.lineRGB[1] + ", " + this.lineRGB[2] + ", " + this.lineAlpha + ")";
	}

	this.GetLineColorHex = function()
	{
		return rgb2hex(this.lineRGB[0], this.lineRGB[1], this.lineRGB[2]);
	}

	this.SetFillColor = function(hexColor)
	{
		var rgb = parseColor(hexColor);

		this.fillRGB[0] = rgb.r;
		this.fillRGB[1] = rgb.g;
		this.fillRGB[2] = rgb.b;
	}

	this.GetFillColor = function()
	{
		if (this.fillAlpha <= 0)
			return undefined;

		return "rgba(" + this.fillRGB[0] + ", " + this.fillRGB[1] + ", " + this.fillRGB[2] + ", " + this.fillAlpha + ")";
	}

	this.GetLineWidth = function(selected)
	{
		var width = selected ? 4 : this.lineWidth;

		if (selected && this.lineWidth>=4)
		{
			width = this.lineWidth * 2;
		}

		return width;
	}

	this.NeedOutline = function()
	{
		return (this.lineWidth>0 && this.lineAlpha>0);
	}

	this.saveAsJavascript = function (objectName)
	{
		var str = "";
		str += objectName + ".appearance.lineWidth = " + this.lineWidth + ";\n";
		str += objectName + ".appearance.lineRGB[0] = " + this.lineRGB[0] + ";\n";
		str += objectName + ".appearance.lineRGB[1] = " + this.lineRGB[1] + ";\n";
		str += objectName + ".appearance.lineRGB[2] = " + this.lineRGB[2] + ";\n";
		str += objectName + ".appearance.lineAlpha = " + this.lineAlpha + ";\n";
		str += objectName + ".appearance.lineDashIndex = " + this.lineDashIndex + ";\n";
		str += objectName + ".appearance.fillRGB[0] = " + this.fillRGB[0] + ";\n";
		str += objectName + ".appearance.fillRGB[1] = " + this.fillRGB[1] + ";\n";
		str += objectName + ".appearance.fillRGB[2] = " + this.fillRGB[2] + ";\n";
		str += objectName + ".appearance.fillAlpha = " + this.fillAlpha + ";\n";

		return str;
	}

	this.SetFromOldProperties = function(obj, mapWidthToLineAlpha)
	{
		if (mapWidthToLineAlpha == undefined)
			mapWidthToLineAlpha = true;

		if (obj.color != undefined)
		{
			this.SetLineColor(obj.color);
			delete obj.color;
		}

		if (obj.fillColor != undefined)
		{
			this.SetFillColor(obj.fillColor);
			delete obj.fillColor;
		}

		if (obj.fillAlpha != undefined)
		{
			this.fillAlpha = obj.fillAlpha;
			delete obj.fillAlpha;
		}

		if (obj.width != undefined && mapWidthToLineAlpha)
		{
			this.lineAlpha = obj.width;
			delete obj.width;
		}
	}

	if (lineColor != undefined)
	{
		this.SetLineColor(lineColor);
	}

	if (fillColor != undefined)
	{
		this.SetFillColor(fillColor);
	}

	if (lineAlpha != undefined)
	{
		this.lineAlpha = lineAlpha;
	}

	if (lineWidth != undefined)
	{
		this.lineWidth = lineWidth;
	}

	if (fillAlpha != undefined)
	{
		this.fillAlpha = fillAlpha;
	}
}

function AppearanceControl(appearance, showOutline, showFill, callback)
{
	this.appearance = appearance;

	this.addControls = function(parentElement)
	{
		var outerDiv = document.createElement('span');
		outerDiv.className = "toolbar";
		outerDiv.style.display = "flex";
		outerDiv.style.flexDirection = "row";

		// Outline
		if (showOutline)
		{
			var div = document.createElement('div');
			div.style.textAlign = "center";
			div.style.padding = "10px";

			var title = document.createElement("span");
			title.innerHTML = "Outline";
			title.style.fontWeight = "bold";
			div.appendChild(title);

			var spacer = document.createElement('div')
			spacer.style.height = "10px";
			div.appendChild(spacer);

			var colorPickerImg = document.createElement("img");
			colorPickerImg.src = "images/color_wheel.svg";
			colorPickerImg.width = 256;
			colorPickerImg.height = 256;
			colorPickerImg.style.verticalAlign = "middle";
			colorPickerImg.style.userSelect = "none";
			colorPickerImg.style.msUserSelect = "none";
			colorPickerImg.style.webkitUserSelect = "none";
			colorPickerImg.style.cursor = "crosshair";
			colorPickerImg.draggable = false;
			div.appendChild(colorPickerImg);

			var imgCanvas = document.createElement('canvas');
			imgCanvas.width = colorPickerImg.width;
			imgCanvas.height = colorPickerImg.height;
			imgCanvas.getContext('2d').drawImage(colorPickerImg, 0, 0, colorPickerImg.width, colorPickerImg.height);

			colorPickerImg.onmousedown = function(evt)
			{
				var pixelData = imgCanvas.getContext('2d').getImageData(evt.offsetX, evt.offsetY, 1, 1).data;

				this.appearance.lineRGB[0] = pixelData[0];
				this.appearance.lineRGB[1] = pixelData[1];
				this.appearance.lineRGB[2] = pixelData[2];

				callback();

				evt.preventDefault();
			}.bind(this);

			colorPickerImg.onmousemove =  function(evt)
			{
				if (evt.buttons & 1)
				{
					var pixelData = imgCanvas.getContext('2d').getImageData(evt.offsetX, evt.offsetY, 1, 1).data;

					this.appearance.lineRGB[0] = pixelData[0];
					this.appearance.lineRGB[1] = pixelData[1];
					this.appearance.lineRGB[2] = pixelData[2];

					callback();

					evt.preventDefault();
				}

			}.bind(this);

			var spacer = document.createElement('div')
			spacer.style.height = "10px";
			div.appendChild(spacer);

			var table = document.createElement("table");
			div.appendChild(table);

			var row = table.insertRow();
			var cell1 = row.insertCell(0);
			var cell2 = row.insertCell(1);

			cell1.innerHTML = "Alpha";
			cell1.style.textAlign = "left";
			var lineAlpha = new Slider(0, 1, this.appearance.lineAlpha, 0.1, function(value) { this.appearance.lineAlpha = value; callback(); }.bind(this));
			lineAlpha.addControls(cell2);

			var row = table.insertRow();
			var cell1 = row.insertCell(0);
			var cell2 = row.insertCell(1);

			cell1.innerHTML = "Width";
			cell1.style.textAlign = "left";
			var lineWidth = new Slider(0, 10, this.appearance.lineWidth, 0.5, function(value) { this.appearance.lineWidth = value; callback(); }.bind(this) );
			lineWidth.addControls(cell2);

			var row = table.insertRow();
			var cell1 = row.insertCell(0);
			var cell2 = row.insertCell(1);

			cell1.innerHTML = "Dash";
			cell1.style.textAlign = "left";
			var lineAlpha = new Dropdown([	"---------------------", 
											"- - - - - - - - - - -", 
											"--  --  --  --  --  --", 
											"---   ---   ---   ---", 
											"----    ----    ----"], this.appearance.lineDashIndex, function(value) { this.appearance.lineDashIndex = value; callback(); }.bind(this));
			lineAlpha.addControls(cell2);

			outerDiv.appendChild(div);
		}

		// Fill
		if (showFill)
		{
			var div = document.createElement('div');
			div.style.textAlign = "center";
			div.style.padding = "10px";

			var title = document.createElement("span");
			title.innerHTML = "Fill";
			title.style.fontWeight = "bold";
			div.appendChild(title);

			var spacer = document.createElement('div')
			spacer.style.height = "10px";
			div.appendChild(spacer);

			var colorPickerImg = document.createElement("img");
			colorPickerImg.src = "images/color_wheel.svg";
			colorPickerImg.width = 256;
			colorPickerImg.height = 256;
			colorPickerImg.style.verticalAlign = "middle";
			colorPickerImg.style.userSelect = "none";
			colorPickerImg.style.msUserSelect = "none";
			colorPickerImg.style.webkitUserSelect = "none";
			colorPickerImg.style.cursor = "crosshair";
			colorPickerImg.draggable = false;
			div.appendChild(colorPickerImg);

			var imgCanvas = undefined;

			colorPickerImg.onload = function()
			{
				imgCanvas = document.createElement('canvas');
				imgCanvas.width = colorPickerImg.width;
				imgCanvas.height = colorPickerImg.height;
				imgCanvas.getContext('2d').drawImage(colorPickerImg, 0, 0, colorPickerImg.width, colorPickerImg.height);
			}

			colorPickerImg.onmousedown = function(evt)
			{
				if (imgCanvas != undefined)
				{
					var pixelData = imgCanvas.getContext('2d').getImageData(evt.offsetX, evt.offsetY, 1, 1).data;

					this.appearance.fillRGB[0] = pixelData[0];
					this.appearance.fillRGB[1] = pixelData[1];
					this.appearance.fillRGB[2] = pixelData[2];

					callback();

					evt.preventDefault();
				}
			}.bind(this);

			colorPickerImg.onmousemove =  function(evt)
			{
				if (evt.buttons & 1)
				{
					var pixelData = imgCanvas.getContext('2d').getImageData(evt.offsetX, evt.offsetY, 1, 1).data;

					this.appearance.fillRGB[0] = pixelData[0];
					this.appearance.fillRGB[1] = pixelData[1];
					this.appearance.fillRGB[2] = pixelData[2];

					callback();

					evt.preventDefault();
				}

			}.bind(this);

			var spacer = document.createElement('div')
			spacer.style.height = "10px";
			div.appendChild(spacer);

			var table = document.createElement("table");
			div.appendChild(table);

			var row = table.insertRow();
			var cell1 = row.insertCell(0);
			var cell2 = row.insertCell(1);

			cell1.innerHTML = "Alpha";
			cell1.style.textAlign = "left";
			var fillAlpha = new Slider(0, 1, this.appearance.fillAlpha, 0.1, function(value) { this.appearance.fillAlpha = value; callback(); }.bind(this));
			fillAlpha.addControls(cell2);

			outerDiv.appendChild(div);
		}

		parentElement.appendChild(outerDiv);
	}
}

var g_hintAvoidArea = undefined;

function ShowPopupHint(anchorPoint, title, contents, parentElement)
{
	this.hintDiv = undefined;
	this.parentElement = parentElement;

	if (g_hintAvoidArea != undefined)
	{
		anchorPoint[0] = Math.min(anchorPoint[0], g_hintAvoidArea[0]);
		anchorPoint[1] = Math.min(anchorPoint[1], g_hintAvoidArea[1]);
		anchorPoint[2] = Math.max(anchorPoint[2], g_hintAvoidArea[2]);
		anchorPoint[3] = Math.max(anchorPoint[3], g_hintAvoidArea[3]);
	}

	this.makeDiv = function()
	{
		this.hintDiv = document.createElement("div");
		this.hintDiv.className = "hint";
		this.hintDiv.style.position = "fixed";

		// Give it some arbitrary position so that the getBoundingClientRect() call below gets the full dimensions (no line wrap).
		this.hintDiv.style.left = 10;//anchorPoint[0];
		this.hintDiv.style.top = 10;//anchorPoint[1];
		this.hintDiv.style.maxWidth = 250;

		if (title)
			this.hintDiv.innerHTML = "<h1>" + title + "</h1>";
		else
			this.hintDiv.innerHTML = "";

		//if (title && contents)
		//	this.hintDiv.innerHTML += "<p>";
	
		this.hintDiv.innerHTML += contents;

		this.parentElement = parentElement;

		this.parentElement.appendChild(this.hintDiv);
	}

	this.setupPosition = function()
	{
		var divRect = this.hintDiv.getBoundingClientRect();
		var divWidth = divRect.right - divRect.left;
		var divHeight = divRect.bottom - divRect.top;

		var threshold = 50;

		if (anchorPoint[0] <= threshold) // left edge
		{
			this.hintDiv.style.left = anchorPoint[2] + 5;

			if ( (anchorPoint[1] + divHeight) >= window.innerHeight )
			{
				this.hintDiv.style.top = anchorPoint[3] - divHeight;
			}
			else 
			{
				this.hintDiv.style.top = anchorPoint[1];
			}
		}
		else if (anchorPoint[2] >= (window.innerWidth - threshold)) // right edge
		{
			this.hintDiv.style.left = anchorPoint[0] - divWidth - 5;

			if ( (anchorPoint[1] + divHeight) >= window.innerHeight )
			{
				this.hintDiv.style.top = anchorPoint[3] - divHeight;
			}
			else 
			{
				this.hintDiv.style.top = anchorPoint[1];
			}
		}
		else if (anchorPoint[1] <= threshold) // top edge
		{
			this.hintDiv.style.top = anchorPoint[3] + 5;

			if ( (anchorPoint[0] + divWidth) >= window.innerWidth )
			{
				this.hintDiv.style.left = anchorPoint[2] - divWidth;
			}
			else
			{
				this.hintDiv.style.left = anchorPoint[0];
			}
		}
		else if (anchorPoint[3] >= (window.innerHeight - threshold)) // bottom edge
		{
			this.hintDiv.style.top = anchorPoint[1] - divHeight - 5;

			if ( (anchorPoint[0] + divWidth) >= window.innerWidth )
			{
				this.hintDiv.style.left = anchorPoint[2] - divWidth;
			}
			else
			{
				this.hintDiv.style.left = anchorPoint[0];
			}
		}
		else // fallback
		{
			if ( (anchorPoint[2] + divWidth) >= window.innerWidth )
			{
				this.hintDiv.style.left = anchorPoint[0] - divWidth -5;
			}
			else
			{
				this.hintDiv.style.left = anchorPoint[2] + 5;
			}

			if ( (anchorPoint[1] + divHeight) >= window.innerHeight )
			{
				this.hintDiv.style.top = anchorPoint[1] - divHeight;
			}
			else 
			{
				this.hintDiv.style.top = anchorPoint[1];
			}
		}
	}

	this.show = function(show)
	{
		if (show == undefined || show)
			this.hintDiv.style.visibility = "visible";
		else
			this.hide();
	}

	this.hide = function()
	{
		this.hintDiv.style.visibility = "hidden";
	}

	this.destroy = function()
	{
		this.parentElement.removeChild(this.hintDiv);
	}

	this.makeDiv();
	this.setupPosition();
}

function PropertyBar(parentElement)
{
	var controls = [];
	var container;

	this.init = function()
	{
		container = document.createElement("div");
		container.className = "toolbar";
		container.style.height = "38px";
		container.style.paddingLeft = "8px";
		container.style.paddingTop = "4px";
		container.style.border = 'none';
		container.style.flex = "2";
		container.style.overflow = "auto";

		parentElement.appendChild(container);
	}

	this.setProperties = function(newProperties)
	{
		controls = [];

		while (container.firstChild) 
		{
			container.removeChild(container.firstChild);
		}

		for (var i=0; i!=newProperties.length; ++i)
		{
			if (newProperties[i] != undefined)
			{
				this.addProperty(newProperties[i].name, newProperties[i].control);
			}
		}

		this.show();
	}

	this.addProperty = function(name, control)
	{
		var propertyDiv = document.createElement("span");
		propertyDiv.className = "toolbar";

		var nameElement = document.createElement("span");
		nameElement.className = "toolbar";

		var spacerElement = document.createElement("span");
		spacerElement.className = "toolbar";
		spacerElement.style.margin = "4px";

		var controlElement = document.createElement("span");
		controlElement.className = "toolbar";

		var dividerElement = document.createElement("span");
		dividerElement.className = "toolbar";
		dividerElement.style.border = "1px solid #AAAAAA";
		dividerElement.style.margin = "8px";


		nameElement.innerHTML = name === undefined? "" : name;
		control.addControls(controlElement);

		propertyDiv.appendChild(nameElement);
		propertyDiv.appendChild(spacerElement);
		propertyDiv.appendChild(controlElement);
		propertyDiv.appendChild(dividerElement);

		container.appendChild(propertyDiv);
	}

	this.getProperty = function(name)
	{
		for (var i=0; i!=controls.length; ++i)
		{
			if (controls[i].name == name)
			{
				return controls[i].control;
			}
		}

		return undefined;
	}

	this.show = function()
	{
		container.style.display = "block";
	}

	this.hide = function()
	{
		container.style.display = "none";
	}

	this.init();
};

function PropertyGrid(parentElement)
{
	var controls = [];
	var tableElement;

	this.init = function()
	{
		tableElement = document.createElement("table");
		tableElement.className = "propertyGrid";
		tableElement.style.width = "100%";
		tableElement.style.backgroundColor = "#EEEEEE";
		tableElement.style.border = 'none';//'1px solid black';
		tableElement.style.fontSize = "12px";

		parentElement.appendChild(tableElement);
	}

	this.setProperties = function(newProperties)
	{
		controls = [];

		while(tableElement.rows[0]) tableElement.deleteRow(0);

		for (var i=0; i!=newProperties.length; ++i)
		{
			this.addProperty(newProperties[i].name, newProperties[i].control);
		}

		this.show();
	}

	this.addProperty = function(name, control)
	{
		var row = tableElement.insertRow()
		var nameCell = row.insertCell();
		var valueCell = row.insertCell();
		nameCell.innerHTML = name === undefined? "" : name;
		control.addControls(valueCell);
	}

	this.getProperty = function(name)
	{
		for (var i=0; i!=controls.length; ++i)
		{
			if (controls[i].name == name)
			{
				return controls[i].control;
			}
		}

		return undefined;
	}

	this.show = function()
	{
		tableElement.style.display = "block";
	}

	this.hide = function()
	{
		tableElement.style.display = "none";
	}

	this.init();
};

// https://stackoverflow.com/questions/23187013/is-there-a-better-way-to-sanitize-input-with-javascript
function sanitizeString(str)
{
    str = str.replace(/[^a-z0-9]/gim, "");
    return str.trim();
}