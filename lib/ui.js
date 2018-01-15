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
		var div = document.createElement('div');
	
		textLabel = document.createElement('text');
		textLabel.innerHTML = currentValue.toFixed(2);
		textLabel.style.display = "inline";
		textLabel.addEventListener('click', this.showEditBox.bind(this));

		editBox = document.createElement('input');
		editBox.type = "number";
		editBox.style.display = "none";
		editBox.style.width = 80;
		editBox.value = currentValue.toFixed(2);
		editBox.addEventListener('blur', this.hideEditBox.bind(this));
		editBox.addEventListener('keypress', this.editBoxKeyPress.bind(this));
	
		inputNode = document.createElement('input');
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
		textLabel.innerHTML = currentValue.toFixed(2);
		textLabel.style.display = "inline";
		textLabel.addEventListener('click', this.showEditBox.bind(this));

		editBox = document.createElement('input');
		editBox.type = "number";
		editBox.style.display = "none";
		editBox.style.width = 80;
		editBox.value = currentValue.toFixed(2);
		editBox.addEventListener('blur', this.hideEditBox.bind(this));
		editBox.addEventListener('keypress', this.editBoxKeyPress.bind(this));
	
		inputNode = document.createElement('input');
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

function Button(imgSrc, sizeOverride, textLabel, callback)
{
	this.btn = undefined;
	this.img = undefined;
	this.label = undefined;

	this.getBoundingClientRect = function()
	{
		return this.btn.getBoundingClientRect();
	}

	this.addControls = function(parentElement)
	{
		this.btn = document.createElement("div");

		this.btn.style.background = "#EEEEEE";
		this.btn.style.padding = "2px 10px 2px 10px";
		//this.btn.style.display = "inline";
		this.btn.onmouseenter = function() { this.btn.style.background = "#AAAAAA";	}.bind(this);
		this.btn.onmouseleave = function() { this.btn.style.background = "#EEEEEE";	}.bind(this);
		this.btn.onmousedown  = function() { this.btn.style.background = "#FFFFFF";	}.bind(this);
		this.btn.onmouseup    = function() { this.btn.style.background = "#AAAAAA";	}.bind(this);
		this.btn.onclick	  = callback;

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
			this.label.style.cursor = "default";
			this.label.style.marginLeft = 15;

			this.btn.appendChild(this.label);
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
		tickBox.setAttribute("type", "checkbox"); 
		tickBox.onclick = onClick;
		tickBox.checked = ticked;
		parentElement.appendChild(tickBox);
	}
}

function Tickbox(imgSrc, sizeOverride, textLabel, currentValue, callback)
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

		this.btn.img.style.borderRadius = "10px 0px 10px 0px";
	}

	this.addControls = function(parentElement)
	{
		this.btn = new Button(imgSrc, sizeOverride, textLabel, this.toggle.bind(this));
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
		picker.setAttribute("type", "color"); 
		picker.onchange = onchange;
		picker.value = color;
		parentElement.appendChild(picker);
	}
}

function TextBox(value, singleLine, maxLength, callback)
{
	var textArea;
	var textValue;
	var singleLine;

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
			textArea.type = "text";
			textArea.value = value;
			textArea.onchange = onchange;
			textArea.maxLength = maxLength;
			textArea.onkeypress = function(e) 
				{
					var event = e || window.event;
					var charCode = event.which || event.keyCode;

					if ( charCode == '13' ) 
					{
						onchange();
					}
				}
		}
		else
		{
			textArea = document.createElement("textarea");
			textArea.style.border = "2px solid black";
			textArea.style.height = 25;
			textArea.style.width = 200;
			textArea.style.fontFamily = "Verdana,sans-serif";
			textArea.style.fontSize = "small";
			textArea.value = value;
			textArea.addEventListener('blur', onchange, false);
		}

		parentElement.appendChild(textArea);
	}
}

function Divider()
{
	this.addControls = function(parentElement)
	{
		var div = document.createElement("div");

		var divInner = document.createElement("div");

		div.style.background = "#EEEEEE";
		div.style.padding = "2px 10px 2px 10px";

		divInner.style.border = "1px solid black";

		div.appendChild(divInner);
		parentElement.appendChild(div);
	}
}

function MultiToolButtonxxx(sizeOverride)
{
	this.controls			= [];
	this.activeControl		= 0;
	this.popoutDirection	= direction;
	this.popoutDiv			= undefined;
	this.img				= undefined;
	this.popoutTimeout		= undefined;
	this.drawerStyleImg		= drawerStyleImg;
	this.sizeOverride		= sizeOverride;

	this.addButton = function(imgSrc, textLabel, callback)
	{
		this.controls.push( {imgSrc:imgSrc, textLabel:textLabel, callback:callback } );
	}

	this.updateDiv = function(direction)
	{
		var rect = this.img.getBoundingClientRect();
		var divRect = this.popoutDiv.getBoundingClientRect();

		var divSize = Math.max( (divRect.right - divRect.left), (divRect.bottom - divRect.top) );

		if (direction == "up")
		{
			this.popoutDiv.style.top = rect.top - divSize;
			this.popoutDiv.style.left = rect.left;
			this.popoutDiv.style.width = (rect.right - rect.left) + 'px';
			this.popoutDiv.style.height = "auto";
		}
		else if (direction == "down")
		{
			this.popoutDiv.style.top = rect.bottom;
			this.popoutDiv.style.left = rect.left;
			this.popoutDiv.style.width = (rect.right - rect.left) + 'px';
			this.popoutDiv.style.height = "auto";
		}
		else if (direction == "right")
		{
			this.popoutDiv.style.left = rect.right;
			this.popoutDiv.style.top = rect.top;
			this.popoutDiv.style.width = "auto";
			this.popoutDiv.style.height = (rect.bottom - rect.top) + 'px';
		}
		else if (direction == "left")
		{
			this.popoutDiv.style.left = rect.left - divSize;
			this.popoutDiv.style.top = rect.top;
			this.popoutDiv.style.width = "auto";
			this.popoutDiv.style.height = (rect.bottom - rect.top) + 'px';
		}

		if (this.drawerStyleImg == undefined)
		{
			this.img.onclick = this.controls[this.activeControl].callback;
			this.img.src = this.controls[this.activeControl].image;

			if (this.controls[this.activeControl].hint != undefined)
			{
				this.img.title = this.controls[this.activeControl].hint;
			}
		}
		else
		{
			this.img.src = this.drawerStyleImg;
		}

		if (this.sizeOverride != undefined)
		{
			this.img.width = this.sizeOverride[0];
			this.img.height = this.sizeOverride[1];
		}
	}

	this.addControls = function(parentElement)
	{
		if (this.controls.length == 0)
			return;

		this.popoutDiv = document.createElement("div");
		this.popoutDiv.style.position = "fixed";
		this.popoutDiv.style.visibility = "hidden";
		this.popoutDiv.style.background = "#EEEEEE";
		//this.popoutDiv.style.padding = 5;
		this.popoutDiv.style.boxShadow = "3px 3px 5px #999999";
		this.popoutDiv.onmouseenter = function() { this.popoutDiv.style.visibility = "visible"; }.bind(this);
		this.popoutDiv.onmouseleave = function() { this.popoutDiv.style.visibility = "hidden";  }.bind(this);

		this.img = document.createElement("img");
		this.img.style.padding = 2;
		if (this.drawerStyleImg != undefined)
		{
			this.img.onclick = function() { this.popoutDiv.style.visibility = "visible"; }.bind(this);
		}
		else	
		{
			this.img.onmouseenter = function() { this.popoutTimeout = setTimeout( function() { this.popoutDiv.style.visibility = "visible"; }.bind(this), 500); }.bind(this);
			this.img.onmouseleave = function() { this.popoutDiv.style.visibility = "hidden"; clearTimeout(this.popoutTimeout); }.bind(this);
		}

		this.img.onmousemove = function(evt)
		{
			if (direction == undefined || direction == "auto")
			{
				var rect = this.img.getBoundingClientRect();
				var midX = (rect.left + rect.right) * 0.5;
				var midY = (rect.top + rect.bottom) * 0.5;

				var deltaX = evt.clientX - midX;
				var deltaY = evt.clientY - midY;

				var newDir;

				if (Math.abs(deltaX) > Math.abs(deltaY))
				{
					if (deltaX>0)	newDir = "right";
					else			newDir = "left";
				}
				else
				{
					if (deltaY>0)	newDir = "down";
					else			newDir = "up";
				}

				this.updateDiv(newDir);
			}
		}.bind(this);

		for (var i=0; i!=this.controls.length; ++i)
		{
			var img = document.createElement("img");

			img.style.border = "1px solid transparent";
			img.onload		 = function() { this.updateDiv(this.popoutDirection);		 }.bind(this);
			img.onmouseenter = function() { this.style.border = "1px solid black";		 }.bind(img);
			img.onmouseleave = function() { this.style.border = "1px solid transparent"; }.bind(img);
			img.src			 = this.controls[i].image;
			img.style.padding = 2;

			if (this.sizeOverride != undefined)
			{
				img.width = this.sizeOverride[0];
				img.height = this.sizeOverride[1];
			}

			if (this.controls[i].hint != undefined)
			{
				img.title = this.controls[i].hint;
			}
	
			(	function(_this, i)
				{
					img.onclick = function() 
						{
							_this.controls[i].callback();

							if (_this.drawerStyleImg == undefined)
							{
								_this.activeControl = i;
								_this.updateDiv(this.popoutDirection);
							}

							_this.popoutDiv.style.visibility = "hidden"; 
							clearTimeout(_this.popoutTimeout);
						};
				}
			)(this, i);


			this.popoutDiv.appendChild(img);
		}

		parentElement.appendChild(this.img);
		parentElement.appendChild(this.popoutDiv);
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

	this.addButton = function(imgSrc, textLabel, callback)
	{
		this.buttons.push(new Button(imgSrc, sizeOverride, textLabel, callback));
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

		this.popoutDiv.style.position = "fixed";
		this.popoutDiv.style.visibility = "hidden";
		this.popoutDiv.style.border = "1px solid black";
		this.popoutDiv.style.boxShadow = "3px 3px 5px #999999";
		this.popoutDiv.onmouseenter = function() { this.popoutDiv.style.visibility = "visible"; clearTimeout(this.popoutTimeout); }.bind(this);
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
			var parentRect = this.popoutDiv.parentElement.getBoundingClientRect();
			
			this.popoutDiv.style.left = rect.right + 10;
			this.popoutDiv.style.top = rect.top;
			this.popoutDiv.style.visibility = "visible"; 
		}
		else
		{
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
		this.buttonDiv.onmouseenter = function() { this.popoutTimeout = setTimeout( function() { this.showPopout(true); }.bind(this), 500); }.bind(this);
		this.buttonDiv.onmouseleave = function() { this.popoutTimeout = setTimeout( function() { this.showPopout(false); }.bind(this), 200); }.bind(this);

		this.updateButton();

		parentElement.appendChild(this.buttonDiv);
	}
}


function MenuPopoutButton(imgSrc, sizeOverride, textLabel)
{
	this.button		= undefined;
	this.controls	= [];
	this.popoutDiv	= undefined;

	this.addControl = function(control)
	{
		this.controls.push(control);
	}

	this.makePopoutDiv = function()
	{
		this.popoutDiv = document.createElement("div");
		this.popoutDiv.style.position = "fixed";
		this.popoutDiv.style.visibility = "hidden";
		this.popoutDiv.style.border = "1px solid black";
		this.popoutDiv.style.boxShadow = "3px 3px 5px #999999";

		for (var i=0; i!=this.controls.length; ++i)
		{
			var div = document.createElement("div");
			div.style.display = "block";
			this.controls[i].addControls(div);
			this.popoutDiv.appendChild(div);
		}

		window.addEventListener('click', function(event) 
			{
				var rect = this.button.getBoundingClientRect();
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
			var rect = this.button.getBoundingClientRect();
			var divRect = this.popoutDiv.getBoundingClientRect();
			var parentRect = this.popoutDiv.parentElement.getBoundingClientRect();
			
			this.popoutDiv.style.right = document.documentElement.clientWidth - rect.left + 10;
			this.popoutDiv.style.top = rect.top;
			this.popoutDiv.style.visibility = "visible"; 
		}
		else
		{
			this.popoutDiv.style.visibility = "hidden"; 
		}
	}

	this.addControls = function(parentElement)
	{
		this.makePopoutDiv();
		parentElement.appendChild(this.popoutDiv);

		this.button = new Button(imgSrc, sizeOverride, textLabel, this.showPopout.bind(this));
		this.button.addControls(parentElement);
	}
}

function PropertyGrid(parentElement)
{
	var controls = [];
	var tableElement;

	this.init = function()
	{
		tableElement = document.createElement("table");
		tableElement.className = "propertyGrid";
		tableElement.style.width = "100%";
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