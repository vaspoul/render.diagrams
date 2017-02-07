function getMousePos(evt, canvas)
{
	var rect = canvas.getBoundingClientRect();

	return	{
				x: (evt.clientX - rect.left),
				y: (evt.clientY - rect.top)
			};
}

function Slider(minVal, maxVal, initialVal, stepVal, callback)
{
	var currentValue = initialVal;
	var inputNode;
	var currentValueNode;

	this.getValue = function()
	{
		return currentValue;
	}

	this.updateValue = function()
	{
		currentValue = inputNode.value * stepVal;

		currentValueNode.nodeValue = currentValue.toFixed(2);

		if (callback !== undefined)
			callback(currentValue);
	}

	this.addControls = function (parentElement)
	{
		var div = document.createElement('div');
		//div.align = "center";
	
		currentValueNode = document.createTextNode(currentValue.toFixed(2));
	
	
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
		div.appendChild(currentValueNode);

		parentElement.appendChild(div);
	}
}

function Button(label, callback)
{
	this.addControls = function(parentElement)
	{
		var btn = document.createElement("BUTTON");
		btn.appendChild(document.createTextNode(label)); 
		parentElement.appendChild(btn);
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
		nameCell.innerHTML = name;
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
