function getMousePos(evt, canvas)
{
	var rect = canvas.getBoundingClientRect();

	return	{
				x: (evt.clientX - rect.left),
				y: (evt.clientY - rect.top)
			};
}

function Slider(parentNode, label, minVal, maxVal, initialVal, stepVal, callback)
{
	var div = document.createElement('div');
	div.align = "center";
	
	var inputNode;
	
	var currentValueNode = document.createTextNode(initialVal.toFixed(2));
	
	function updateValue()
	{
		currentValueNode.nodeValue = (inputNode.value * stepVal).toFixed(2);
		div.currentValue = inputNode.value * stepVal;
		callback();
	}
	
	inputNode = document.createElement('input');
	inputNode.min = minVal/stepVal;
	inputNode.max = maxVal/stepVal;
	inputNode.step = 1;
	inputNode.type = "range";
	inputNode.value = initialVal/stepVal;
	inputNode.oninput = updateValue;
	
	div.appendChild(document.createTextNode(label + " : " + minVal + " "));
	div.appendChild(inputNode);
	div.appendChild(document.createTextNode(" " + maxVal + " : "));
	div.appendChild(currentValueNode);

	parentNode.appendChild(div);
	
	div.currentValue = initialVal;
	
	return div;
}
