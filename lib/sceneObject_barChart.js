// ----------------------------------------------------------------------------------------------------------------
// BarChart
// ----------------------------------------------------------------------------------------------------------------
var lastBarChartAppearance = new Appearance("#900090", 1, 1, "#FFFFFF", 1);

function BarChart(A, B)
{
	this.scene				= null;
	this.selected			= false;
	this.A					= A;
	this.B					= B;
	this.values				= [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
	this.userValues			= [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined];
	this.valuesFunctionStr	= "return Math.sin(index)*10;";
	this.showMip			= 0;
	this.visible			= true;
	this.frozen				= false;
	this.appearance			= lastBarChartAppearance.copy();
	this.onChangeListeners	= [];
	this.boundsMin			= new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
	this.boundsMax			= new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

	this.getBoundsMin = function()
	{
		return this.boundsMin;
	}

	this.getBoundsMax = function()
	{
		return this.boundsMax;
	}

	this.saveAsJavascript = function()
	{
		var str = "var bar = new BarChart(";

		str += "new Vector(" + this.A.x + ", " + this.A.y + ")";
		str += ", new Vector(" + this.B.x + ", " + this.B.y + ")";
		str += ");\n";

		str += this.appearance.saveAsJavascript("bar");
		str += "bar.valuesFunctionStr = unescape(\"" + escape(this.valuesFunctionStr) + "\");\n";

		str += "bar.values = [";

		for (var i = 0; i != this.values.length; ++i)
			str += ((i > 0) ? ", " : "") + this.values[i];

		str += "];\n";

		str += "bar.userValues = [";

		for (var i = 0; i != this.values.length; ++i)
			str += ((i > 0) ? ", " : "") + this.userValues[i];

		str += "];\n";

		str += "bar.showMip = " + this.showMip + ";\n";

		str += "bar.visible = " + this.visible + ";\n";
		str += "bar.frozen = " + this.frozen + ";\n";

		if (this.name != undefined)
		{
			str += "bar.name = \"" + this.name + "\";\n";
		}

		str += "bar.onChange();\n";

		str += "scene.addObject(bar);\n";
		return str;
	}

	this.addChangeListener = function(listener)
	{
		this.onChangeListeners.push(listener);
	}

	this.onChange = function(changeDetails)
	{
		// Backwards compatibility
		this.appearance.SetFromOldProperties(this);

		lastBarChartAppearance = this.appearance.copy();

		var unit = sub(this.B, this.A).unit();
		var tan = transpose(unit).neg();
		var delta = distance(this.A, this.B)/this.values.length;

		var minVal = Number.MAX_VALUE;
		var maxVal = -Number.MAX_VALUE;

		// Update values
		{
			var valuesFunction = Function("index", this.valuesFunctionStr);

			for (var i = 0; i != this.values.length; ++i)
			{
				this.values[i] = (this.userValues[i] != undefined) ? this.userValues[i] : valuesFunction(i);

				minVal = Math.min(minVal, this.values[i]);
				maxVal = Math.max(maxVal, this.values[i]);
			}
		}

		this.boundsMin = this.A;
		this.boundsMax = this.A;

		this.boundsMin = min(this.B, this.boundsMin);
		this.boundsMax = max(this.B, this.boundsMax);

		var p0 = mad(tan, minVal, this.A);
		var p1 = mad(tan, maxVal, this.A);
		var p2 = mad(tan, minVal, this.B);
		var p3 = mad(tan, maxVal, this.B);

		this.boundsMin = min(p0, this.boundsMin);
		this.boundsMin = min(p1, this.boundsMin);
		this.boundsMin = min(p2, this.boundsMin);
		this.boundsMin = min(p3, this.boundsMin);

		this.boundsMax = max(p0, this.boundsMax);
		this.boundsMax = max(p1, this.boundsMax);
		this.boundsMax = max(p2, this.boundsMax);
		this.boundsMax = max(p3, this.boundsMax);

		for (var i=0; i!=this.onChangeListeners.length; ++i)
		{
			this.onChangeListeners[i](this, changeDetails);
		}
	}
	
	this.draw = function(camera)
	{
		var unit = sub(this.B, this.A).unit();
		var tan = transpose(unit).neg();

		// Mip N
		//if (this.showMip>0)
		//for (var mip=0; mip<=this.showMip; ++mip)
		{
			var mip = this.showMip;

			var mip0count = Math.pow(2, mip);
			var delta = distance(this.A, this.B) / this.values.length * mip0count;

			var count = this.values.length / mip0count;
			count = Math.floor(count);

			for (var i=0; i!=count; ++i)
			{
				var mip0index = Math.floor(i * mip0count);

				var minVal = Number.MAX_VALUE;
				var maxVal = -Number.MAX_VALUE;
				var avgVal = 0;

				for (var j=0; j!=mip0count; ++j)
				{
					var value = this.values[mip0index + j];

					minVal = Math.min(minVal, value);
					maxVal = Math.max(maxVal, value);
					avgVal += value;
				}

				avgVal /= mip0count;

				var min1 = mad(tan, minVal, mad(unit, i*delta, this.A));
				var min2 = mad(tan, minVal, mad(unit, (i+1)*delta, this.A));
				var max1 = mad(tan, maxVal, mad(unit, i*delta, this.A));
				var max2 = mad(tan, maxVal, mad(unit, (i+1)*delta, this.A));
				var avg1 = mad(tan, avgVal, mad(unit, i*delta, this.A));
				var avg2 = mad(tan, avgVal, mad(unit, (i+1)*delta, this.A));

				camera.drawLineStrip([min1, max1, max2, min2], true, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), [], "rgba(0,0,0,0.2)", this);
			}
		}

		// Mip 0
		{
			var delta = distance(this.A, this.B)/this.values.length;

			var points = [this.B, this.A];

			for (var i = 0; i != this.values.length; ++i)
			{
				var p0 = mad(unit, i*delta, this.A);
				var p1 = mad(tan, this.values[i], mad(unit, i*delta, this.A));
				var p2 = mad(tan, this.values[i], mad(unit, (i+1)*delta, this.A));
				var p3 = mad(unit, (i+1)*delta, this.A);

				points.push(p0);
				points.push(p1);
				points.push(p2);
				points.push(p3);
			}

			camera.drawLineStrip(points, false, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), [], this.appearance.GetFillColor(), this);
		}
	}
	
	this.hitTest = function(a, b, camera)
	{
		if (overlapRectLine(a, b, this.A, this.B))
			return true;

		var unit = sub(this.B, this.A).unit();
		var tan = transpose(unit).neg();
		var delta = distance(this.A, this.B)/this.values.length;

		for (var i = 0; i != this.values.length; ++i)
		{
			var p0 = mad(unit, i*delta, this.A);
			var p1 = mad(tan, this.values[i], mad(unit, i*delta, this.A));
			var p2 = mad(tan, this.values[i], mad(unit, (i+1)*delta, this.A));
			var p3 = mad(unit, (i + 1) * delta, this.A);

			if (overlapRectLine(a, b, p0, p1))
				return true;

			if (overlapRectLine(a, b, p1, p2))
				return true;

			if (overlapRectLine(a, b, p2, p3))
				return true;

			if (this.appearance.fillAlpha > 0)
			{
				if (overlapRectOBB(a,b, [p0,p1,p2,p3]))
				{
					return true;
				}
			}
		}

		return false;
	}

	this.getSnapPoints = function ()
	{
		var points = [];

		points.push( { type: "node", p: this.A} );
		points.push( { type: "node", p: this.B} );

		var unit = sub(this.B, this.A).unit();
		var tan = transpose(unit).neg();
		var delta = distance(this.A, this.B)/this.values.length;

		for (var i = 0; i != this.values.length; ++i)
		{
			var p0 = mad(unit, i*delta, this.A);
			var p1 = mad(tan, this.values[i], mad(unit, i*delta, this.A));
			var p2 = mad(tan, this.values[i], mad(unit, (i+1)*delta, this.A));
			var p3 = mad(unit, (i + 1) * delta, this.A);

			points.push( { type: "node", p: p1} );
			points.push( { type: "node", p: avg(p1,p2)} );
			points.push( { type: "node", p: p2} );
		}

		return points;
	}

	this.getDragPoints = function(localSpace, camera)
	{
		if (this.isFrozen())
			return [];

		var points = [this.A, this.B];

		var unit = sub(this.B, this.A).unit();
		var tan = transpose(unit).neg();
		var delta = distance(this.A, this.B)/this.values.length;

		for (var i = 0; i != this.values.length; ++i)
		{
			var p = mad(tan, this.values[i], mad(unit, (i+0.5)*delta, this.A));

			points.push(p);
		}

		return points;
	}

	this.drawDragPoint = function(camera, index, position, localSpace, alpha)
	{
		if (alpha == undefined)
			alpha = 1;

		var unit = sub(this.B, this.A).unit();
		var tan = transpose(unit).neg();
		var delta = distance(this.A, this.B)/this.values.length;

		if (index == 0)
		{
			camera.drawRectangle(this.A, camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
		}
		else if (index == 1)
		{
			camera.drawRectangle(this.B, camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
		}
		else
		{
			var p = mad(tan, this.values[index-2], mad(unit, (index-2 + 0.5) * delta, this.A))
			var q;

			if (this.values[index-2]>=0)
				q = add(p, mul(tan, camera.invScale(30)));
			else
				q = add(p, mul(tan.neg(), camera.invScale(30)));

			//camera.drawRectangle(p, camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);

			camera.drawArrow(p, q, 8, "rgba(255,0,0," + alpha + ")", 3);
		}
	}

	this.setDragPointPos = function(index, p, localSpace, dragStartPoint, camera)
	{
		if (index == 0)
		{
			this.A = p;
		}
		else if (index == 1)
		{
			this.B = p;
		}
		else
		{
			var unit = sub(this.B, this.A).unit();
			var tan = transpose(unit).neg();
			var delta = distance(this.A, this.B) / this.count;

			this.userValues[index - 2] = dot(sub(p, this.A), tan);
		}

		this.onChange();
	}

	this.getOrigin = function()
	{
		return this.A;
	}
	
	this.setOrigin = function(p)
	{
		var delta = sub(p, this.A);

		this.A = add(this.A, delta);
		this.B = add(this.B, delta);

		this.onChange();
	}

	this.setBarCount = function(count)
	{
		//if (count == this.values.length)
		//	return;

		if (count < this.values.length)
		{
			this.values = this.values.slice(0, count);
		}
		else
		{
			var val = this.values[this.values.length-1];

			for (var i=this.values.length; i!=count; ++i)
			{
				this.values.push(val);
			}
		}

		this.onChange();
	}

	this.getProperties = function()
	{
		var appearanceControl = new PopoutContainer(undefined, "images/color_wheel.svg");
		{
			appearanceControl.addControl("", new AppearanceControl(this.appearance, true, true, function(){ this.onChange(); }.bind(this)) );
		}

		return	[
					{name: "Appearance", control:appearanceControl },
					{name: "Columns", control: new PopoutSlider(1, 20, this.values.length, 1, function (value) { this.setBarCount(value); }.bind(this)) },
					{name: "Show Mip", control: new PopoutSlider(0, 4, this.showMip, 1, function (value) { this.showMip = value; this.onChange(); }.bind(this)) },
					{name: "Values Function", control: new PopoutTextBox(this.valuesFunctionStr, "code", false, 0, function (value) { this.valuesFunctionStr = value; this.onChange(); }.bind(this)) }
				];
	}

	this.toggleVisibility = function(v)
	{
		var newVisible = (v!==undefined) ? v : !this.visible;
		if (this.visible != newVisible)
		{
			this.visible = newVisible;
			this.onChange();
		}
	}

	this.isVisible = function()
	{
		return this.visible;
	}

	this.toggleFrozen = function(f)
	{
		this.frozen = (f!==undefined) ? f : !this.frozen;
		this.onChange();
	}

	this.isFrozen = function()
	{
		return this.frozen;
	}

	this.setSelected = function(selected)
	{
		this.selected = selected;
	}

	this.isSelected = function()
	{
		return this.selected;
	}

	this.onChange();
}
