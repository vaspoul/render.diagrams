function getMousePos(evt, canvas)
{
	var rect = canvas.getBoundingClientRect();

	return	{
				x: (evt.clientX - rect.left),
				y: (evt.clientY - rect.top)
			};
}

// From http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
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

	this.getValue = function()
	{
		return currentValue;
	}

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

function Dropdown(values, initialVal, callback)
{
	var currentValue = initialVal;
	var dropdown;

	function onChange()
	{
		currentValue = dropdown.options[dropdown.selectedIndex].text;

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

			if (currentValue == values[i])
				dropdown.selectedIndex = i;
		}

		dropdown.onchange = onChange;

		parentElement.appendChild(dropdown);
	}
}

function Button(label, callback)
{
	this.addControls = function(parentElement)
	{
		var btn = document.createElement("BUTTON");
		btn.appendChild(document.createTextNode(label));
		btn.onclick = callback;
		btn.style.width = 165;
		btn.style.height = 29;
		parentElement.appendChild(btn);
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

function TextBox(value, singleLine, callback)
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
		div.style.border = "1px solid black";
		div.style.height = 0;
		parentElement.appendChild(div);
	}
}

function PropertyGrid(parentElement)
{
	var controls = [];
	var tableElement;

	this.init = function()
	{
		tableElement = document.createElement("table");
		tableElement.style.width = "100%";
		//tableElement.style.border = '1px solid black';
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
