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

function hex2rgb(hex) 
{
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? 
		{
			r: parseInt(result[1], 16),
			g: parseInt(result[2], 16),
			b: parseInt(result[3], 16)
		} : null;
}

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

	this.showPopout = function()
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
				this.popoutContainer.style.left = (anchorPoint[0] + anchorPoint[2]) * 0.5 - divWidth * 0.5;
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
				g_popoutElementVisible.style.display = "none";
			}
		}

		g_popoutElementVisible = this.popoutContainer; 
	}

	this.hidePopout = function()
	{
		this.popoutContainer.style.display = "none";

		if (g_popoutElementVisible == this.popoutContainer)
		{
			g_popoutElementVisible = undefined;
		}
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

	this.updateValue = function(newValue)
	{
		this.currentValue = newValue;

		this.label.innerHTML = this.currentValue.toFixed(2);
		this.editBox.value = this.currentValue.toFixed(2);
		this.slider.value  = this.currentValue / stepVal;

		if (callback !== undefined)
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

		this.updateValue(this.currentValue);
	}

	this.init();
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

function Button(imgSrc, sizeOverride, textLabel, hintText, callback)
{
	this.btn = undefined;
	this.img = undefined;
	this.label = undefined;
	this.hintDiv = undefined;
	this.popoutTimeout = undefined;

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
			this.label.innerHTML = textLabel;
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

function Tickbox(imgSrc, sizeOverride, textLabel, hintText, currentValue, callback)
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
		this.btn = new Button(imgSrc, sizeOverride, textLabel, hintText, this.toggle.bind(this));
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
	this.controls	= [];
	this.popoutDiv	= undefined;
	this.popoutDirection = popoutDirection;

	this.addControl = function(control)
	{
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

			this.controls[i].addControls(div);
			
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
							this.popoutDiv.style.visibility = "hidden";
							g_popoutElementVisible = undefined;
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
						this.popoutDiv.style.visibility = "hidden";
						g_popoutElementVisible = undefined;
					}
				}
			}.bind(this) );
	}

	this.showPopout = function(show)
	{
		if (show == undefined)
		{
			show = (this.popoutDiv.style.visibility == "hidden") ? true : false;
		}

		if (show)
		{
			var rect = this.button.getBoundingClientRect();
			var divRect = this.popoutDiv.getBoundingClientRect();
			
			this.popoutDiv.style.visibility = "visible"; 
			this.setupPosition();
		}
		else
		{
			this.popoutDiv.style.visibility = "hidden"; 
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
					g_popoutElementVisible = this; 
					this.showPopout(true); 
				}
				else
				{
					g_popoutElementVisible.showPopout(false); 
					g_popoutElementVisible = undefined;
				}
			}.bind(this));

		this.button.addControls(parentElement);

		this.button.btn.onmouseover = function()
		{
			if (g_popoutElementVisible != undefined)
			{
				g_popoutElementVisible.showPopout(false);
				this.showPopout(true);
				g_popoutElementVisible = this;
			}
		}.bind(this);

		this.setupPosition();
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

function PropertyGrid(parentElement)
{
	var controls = [];
	var container;

	this.init = function()
	{
		container = document.createElement("div");
		container.className = "toolbar";
		container.style.height = "28px";
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
			this.addProperty(newProperties[i].name, newProperties[i].control);
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
		spacerElement.style.margin = 4;

		var controlElement = document.createElement("span");
		controlElement.className = "toolbar";

		var dividerElement = document.createElement("span");
		dividerElement.className = "toolbar";
		dividerElement.style.border = "1px solid #AAAAAA";
		dividerElement.style.margin = 8;


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

// https://stackoverflow.com/questions/23187013/is-there-a-better-way-to-sanitize-input-with-javascript
function sanitizeString(str)
{
    str = str.replace(/[^a-z0-9]/gim, "");
    return str.trim();
}