// ----------------------------------------------------------------------------------------------------------------
// Dimension
// ----------------------------------------------------------------------------------------------------------------
function Dimension(A, B, center)
{
	this.scene				= null;
	this.selected			= false;
	this.A					= A;
	this.B					= B;
	this.center				= center;
	this.offset				= 1;
	this.offsetX			= 0.5;
	this.decimals			= 2;
	this.appearance			= new Appearance();
	this.visible			= true;
	this.frozen				= false;
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
		var str = "var dim = new Dimension(";

		str += "new Vector(" + this.A.x + ", " + this.A.y + ")";
		str += ", new Vector(" + this.B.x + ", " + this.B.y + ")";
		if (this.center !== undefined)
		{
			str += ", new Vector(" + this.center.x + ", " + this.center.y + ")";
		}
		str += ");\n";

		str += this.appearance.saveAsJavascript("dim");
		str += "dim.offset = " + this.offset + ";\n";
		str += "dim.offsetX = " + this.offsetX + ";\n";
		str += "dim.decimals = " + this.decimals + ";\n";
		str += "dim.visible = " + this.visible + ";\n";
		str += "dim.frozen = " + this.frozen + ";\n";

		str += "scene.addObject(dim);\n";
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

		this.boundsMin = this.A;
		this.boundsMax = this.A;

		this.boundsMin = min(this.B, this.boundsMin);
		this.boundsMax = max(this.B, this.boundsMax);

		var tan = transpose(sub(this.B, this.A).unit());

		var offsetA0 = mad(tan, this.offset, this.A);
		var offsetB0 = mad(tan, this.offset, this.B);
		var textAnchor = lerp(offsetA0, offsetB0, this.offsetX);

		this.boundsMin = min(offsetA0, this.boundsMin);
		this.boundsMax = max(offsetA0, this.boundsMax);

		this.boundsMin = min(offsetB0, this.boundsMin);
		this.boundsMax = max(offsetB0, this.boundsMax);

		this.boundsMin = min(textAnchor, this.boundsMin);
		this.boundsMax = max(textAnchor, this.boundsMax);

		if (this.center !== undefined)
		{
			this.boundsMin = min(this.center, this.boundsMin);
			this.boundsMax = max(this.center, this.boundsMax);
		}

		for (var i=0; i!=this.onChangeListeners.length; ++i)
		{
			this.onChangeListeners[i](this, changeDetails);
		}
	}
	
	this.draw = function(camera)
	{
		if (this.A == undefined || this.B == undefined)
			return;

		if (this.center !== undefined)
		{
			var points = [this.A, this.center, this.B];

			camera.drawLineStrip(points, false, "#000000", this.appearance.GetLineWidth(this.selected));
		}
		else
		{
			var tan = transpose(sub(this.B, this.A).unit());

			var offsetA0 = mad(tan, this.offset, this.A);
			var offsetA1 = mad(tan, this.offset + Math.sign(this.offset) * camera.invScale(5), this.A);

			var offsetB0 = mad(tan, this.offset, this.B);
			var offsetB1 = mad(tan, this.offset + Math.sign(this.offset) * camera.invScale(5), this.B);

			var textAngle = toAngle(sub(this.B, this.A));
			var factor = 1;

			if (textAngle > Math.PI / 2 || textAngle <= -Math.PI / 2)
			{
				textAngle -= Math.PI;
				factor = -1;
			}

			var textAnchor = lerp(offsetA0, offsetB0, this.offsetX);
			textAnchor = mad(tan.neg(), factor * camera.invScale(5), textAnchor);

			var textAlign = "center";

			camera.drawLine(this.A, offsetA1, "#000000", this.appearance.GetLineWidth(this.selected));
			camera.drawLine(this.B, offsetB1, "#000000", this.appearance.GetLineWidth(this.selected));

			if (this.offsetX >= 0 && this.offsetX <= 1)
			{
				camera.drawArrow(avg(offsetA0, offsetB0), offsetA0, 20, "#000000", this.appearance.GetLineWidth(this.selected));
				camera.drawArrow(avg(offsetA0, offsetB0), offsetB0, 20, "#000000", this.appearance.GetLineWidth(this.selected));
			}
			else if (this.offsetX < 0)
			{
				camera.drawArrow(lerp(offsetA0, offsetB0, this.offsetX), offsetA0, 20, "#000000", this.appearance.GetLineWidth(this.selected));
				camera.drawLine(offsetA0, offsetB0, "#000000", this.appearance.GetLineWidth(this.selected));
				camera.drawArrow(mad(sub(offsetB0, offsetA0).unit(), camera.invScale(30), offsetB0), offsetB0, 20, "#000000", this.appearance.GetLineWidth(this.selected));

				textAlign = "left";
			}
			else if (this.offsetX > 1)
			{
				camera.drawArrow(lerp(offsetA0, offsetB0, this.offsetX), offsetB0, 20, "#000000", this.appearance.GetLineWidth(this.selected));
				camera.drawLine(offsetA0, offsetB0, "#000000", this.appearance.GetLineWidth(this.selected));
				camera.drawArrow(mad(sub(offsetA0, offsetB0).unit(), camera.invScale(30), offsetA0), offsetA0, 20, "#000000", this.appearance.GetLineWidth(this.selected));

				textAlign = "right";
			}


			camera.drawText(textAnchor, distance(this.A, this.B).toFixed(this.decimals), "#000000", textAlign, textAngle);
		}
	}
	
	this.hitTest = function(a, b, camera)
	{
		if (this.center !== undefined)
		{
			var points = [this.A, this.center, this.B];

			if (	overlapRectLine(a, b, this.A, this.center) ||
					overlapRectLine(a, b, this.center, this.B) )
				return true;
		}
		else
		{
			var tan = transpose(sub(this.B, this.A).unit());

			var offsetA0 = mad(tan, this.offset, this.A);
			var offsetB0 = mad(tan, this.offset, this.B);

			if (	overlapRectLine(a, b, offsetA0, offsetB0) ||
					overlapRectLine(a, b, offsetA0, this.A) ||
					overlapRectLine(a, b, offsetB0, this.B) )
				return true;
		}

		return false;
	}

	this.getSnapPoints = function ()
	{
		var points = [];

		if (this.center !== undefined)
		{
			points.push( { type: "node", p: this.center } );
		}
		else
		{
			var tan = transpose(sub(this.B, this.A).unit());

			var offsetA0 = mad(tan, this.offset, this.A);
			var offsetB0 = mad(tan, this.offset, this.B);

			points.push( { type: "node", p: this.A} );
			points.push( { type: "node", p: this.B} );
			points.push( { type: "node", p: lerp(offsetA0, offsetB0, this.offsetX)} );
		}

		return points;
	}

	this.getDragPoints = function(localSpace, camera)
	{
		if (this.isFrozen())
			return [];

		var points = [ ];

		if (this.center !== undefined)
		{
			//points.push( { type: "node", p: this.center } );
		}
		else
		{
			var tan = transpose(sub(this.B, this.A).unit());

			var offsetA0 = mad(tan, this.offset, this.A);
			var offsetB0 = mad(tan, this.offset, this.B);

			points.push( this.A );
			points.push( this.B );
			points.push( lerp(offsetA0, offsetB0, this.offsetX) );
		}

		return points;
	}

	this.drawDragPoint = function(camera, index, position, localSpace, alpha)
	{
		if (alpha == undefined)
			alpha = 1;

		if (this.center !== undefined)
		{
			//points.push( { type: "node", p: this.center } );
		}
		else
		{
			var tan = transpose(sub(this.B, this.A).unit());

			var offsetA0 = mad(tan, this.offset, this.A);
			var offsetB0 = mad(tan, this.offset, this.B);

			if (index == 0)
			{
				camera.drawRectangle(this.A, camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
			}
			else if (index == 1)
			{
				camera.drawRectangle(this.B, camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
			}
			else if (index == 2)
			{
				camera.drawRectangle(lerp(offsetA0, offsetB0, this.offsetX), camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
			}
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
		else if (index == 2)
		{
			var tan = transpose(sub(this.B, this.A).unit());

			this.offset = dot(sub(p, this.A), tan);
			this.offsetX = dot(sub(p, this.A), sub(this.B, this.A)) / distance(this.B, this.A) / distance(this.B, this.A);
		}
		else if (index == 3)
		{
			this.center = p;
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

		if (this.center !== undefined)
		{
			this.center = add(this.center, delta);
		}

		this.onChange();
	}

	this.getProperties = function()
	{
		var appearanceControl = new PopoutContainer(undefined, "images/color_wheel.svg");
		{
			appearanceControl.addControl("", new AppearanceControl(this.appearance, true, false, function(){ this.onChange(); }.bind(this)) );
		}

		return	[
					{ name: "Appearance", control:appearanceControl },
					{ name: "Decimals", control: new PopoutSlider(0, 5, this.decimals, 1, function (value) { this.decimals = value; this.onChange(); }.bind(this)) },
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
