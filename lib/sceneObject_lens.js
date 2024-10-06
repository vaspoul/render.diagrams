// ----------------------------------------------------------------------------------------------------------------
// Lens
// ----------------------------------------------------------------------------------------------------------------
var lastLensAppearance = new Appearance("#900090", 1, 2);

function Lens(p0, p1)
{
	this.scene				= null;
	this.p0					= p0;
	this.p1					= p1;
	this.radiusL			= 15;
	this.radiusR			= 15;
	this.symmetrical		= true;
	this.refractionIndex	= 1.5;
	this.drawCenters		= true;
	this.drawFocus			= true;
	this.selected			= false;
	this.visible			= true;
	this.frozen				= false;
	this.appearance			= lastLensAppearance.copy();
	this.onChangeListeners	= [];
	this.boundsMin			= new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
	this.boundsMax			= new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

	this.xAxis				= new Vector(1,0);
	this.yAxis				= new Vector(0,1);
	this.midPoint			= new Vector(0,0);
	this.centerL			= new Vector(0,0);
	this.centerR			= new Vector(0,0);
	this.focusPointR		= new Vector(0,0);
	this.focusPointL		= new Vector(0,0);
	this.arcHalfAngleL		= 0;
	this.arcHalfAngleR		= 0;

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
		var str = "var lens = new Lens(";

		str += "new Vector(" + this.p0.x + ", " + this.p0.y + ")" + ", ";
		str += "new Vector(" + this.p1.x + ", " + this.p1.y + ")";
		str += ");\n";

		str += "lens.radiusL = " + this.radiusL + ";\n";
		str += "lens.radiusR = " + this.radiusR + ";\n";
		str += "lens.symmetrical = " + this.symmetrical + ";\n";
		str += "lens.refractionIndex = " + this.refractionIndex + ";\n";
		str += "lens.drawCenters = " + this.drawCenters + ";\n";
		str += "lens.drawFocus = " + this.drawFocus + ";\n";
		str += this.appearance.saveAsJavascript("lens");
		str += "lens.visible = " + this.visible + ";\n";
		str += "lens.frozen = " + this.frozen + ";\n";

		str += "scene.addObject(lens);\n";
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

		lastLensAppearance = this.appearance.copy();

		this.midPoint = avg(this.p0, this.p1);
		this.yAxis = sub(this.p1, this.p0).unit();
		this.xAxis = transpose(this.yAxis);

		if (this.symmetrical)
			this.radiusR = this.radiusL;

		var halfHeightSqr = distanceSqr(this.p0, this.p1) * 0.25;
		var halfHeight = Math.sqrt(halfHeightSqr);

		var offsetR = Math.sqrt(this.radiusL * this.radiusL - halfHeightSqr);
		var offsetL = Math.sqrt(this.radiusR * this.radiusR - halfHeightSqr);

		this.centerR = mad(this.xAxis, offsetR, this.midPoint);
		this.centerL = mad(this.xAxis, -offsetL, this.midPoint);

		this.arcHalfAngleL = Math.atan2(halfHeight, offsetR);
		this.arcHalfAngleR = Math.atan2(halfHeight, offsetL);

		var focalLengthL = 1 / ( (this.refractionIndex - 1) * (1 / this.radiusR + 1 / this.radiusL) );
		var focalLengthR = 1 / ( (this.refractionIndex - 1) * (1 / this.radiusL + 1 / this.radiusR) );

		this.focusPointR = mad(this.xAxis, focalLengthR, this.midPoint);
		this.focusPointL = mad(this.xAxis, -focalLengthL, this.midPoint);

		var halfWidthL = this.radiusL - offsetR;
		var halfWidthR = this.radiusR - offsetL;

		this.boundsMin = this.midPoint.copy();
		this.boundsMax = this.midPoint.copy();

		var corners = [
			mad(this.xAxis, -halfWidthL, this.p0),
			mad(this.xAxis, -halfWidthL, this.p1),
			mad(this.xAxis, halfWidthR, this.p0),
			mad(this.xAxis, halfWidthR, this.p1),
		];

		for (var i=0; i!=4; ++i)
		{
			this.boundsMin = min(this.boundsMin, corners[i]);
			this.boundsMax = max(this.boundsMax, corners[i]);
		}

		for (var i=0; i!=this.onChangeListeners.length; ++i)
		{
			this.onChangeListeners[i](this, changeDetails);
		}
	}
	
	this.draw = function(camera)
	{
		var midAngle = toAngle(this.xAxis);
		camera.drawArc(this.centerR, this.radiusL, midAngle + Math.PI - this.arcHalfAngleL, midAngle + Math.PI + this.arcHalfAngleL, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), this.appearance.GetFillColor(), this.appearance.GetLineDash(), false, false, this);
		camera.drawArc(this.centerL, this.radiusR, midAngle - this.arcHalfAngleR, midAngle + this.arcHalfAngleR, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), this.appearance.GetFillColor(), this.appearance.GetLineDash(), false, false, this);

		if (this.drawCenters)
		{
			camera.drawArc(this.centerL, camera.invScale(5), undefined, undefined, "#808080", 1);
			camera.drawRectangle(this.centerL, camera.invScale(2), "#808080", 1, undefined, "#000000");

			camera.drawArc(this.centerR, camera.invScale(5), undefined, undefined, "#808080", 1);
			camera.drawRectangle(this.centerR, camera.invScale(2), "#808080", 1, undefined, "#000000");
		}

	//	if (this.drawFocus)
	//	{
	//		camera.drawCross(this.focusPointL, camera.invScale(5), 0, "#808080", 2);
	//		camera.drawCross(this.focusPointR, camera.invScale(5), 0, "#808080", 2);
	//	}
	}
	
	this.hitTest = function(a, b, camera)
	{
		var rectMin = min(a, b);
		var rectMax = max(a, b);
		
		var midAngle = toAngle(this.xAxis);

		var hit = false;
		hit |= overlapRectArc(rectMin, rectMax, this.centerL, this.radiusR, midAngle - this.arcHalfAngleR, midAngle + this.arcHalfAngleR);
		hit |= overlapRectArc(rectMin, rectMax, this.centerR, this.radiusL, midAngle + Math.PI - this.arcHalfAngleL, midAngle + Math.PI + this.arcHalfAngleL);

		return hit;
	}

	this.rayHitTest = function(rayPos, rayDir, rayRadius)
	{
		var midAngle = toAngle(this.xAxis);

		var results = [];

		var hitResultL = intersectRayArc(rayPos, rayDir, this.centerR, this.radiusL, midAngle + Math.PI - this.arcHalfAngleL, midAngle + Math.PI + this.arcHalfAngleL);
		var hitResultR = intersectRayArc(rayPos, rayDir, this.centerL, this.radiusR, midAngle - this.arcHalfAngleR, midAngle + this.arcHalfAngleR);

		if (hitResultL.hit)
		{
			hitResultL.N = sub(hitResultL.P, this.centerR).unit();
			hitResultL.T = transpose(hitResultL.N);

			var s = Math.sign(dot(rayDir, hitResultL.N));
			var r = (s<0) ? (1 / this.refractionIndex) : this.refractionIndex;
			var t = dot(rayDir, hitResultL.T) * r;
			var n = Math.sqrt(1 - t*t);
			hitResultL.outDir = mad(hitResultL.N, s * n, mul(hitResultL.T, t));
		}

		if (hitResultR.hit)
		{
			hitResultR.N = sub(hitResultR.P, this.centerL).unit();
			hitResultR.T = transpose(hitResultR.N);

			var s = Math.sign(dot(rayDir, hitResultR.N));
			var r = (s<0) ? (1 / this.refractionIndex) : this.refractionIndex;
			var t = dot(rayDir, hitResultR.T) * r;
			var n = Math.sqrt(1 - t*t);
			hitResultR.outDir = mad(hitResultR.N, s * n, mul(hitResultR.T, t));
		}

		var hitResult;

		if (hitResultR.hit && hitResultL.hit)
		{
			hitResult = hitResultR.tRay < hitResultL.tRay ? hitResultR : hitResultL;
		}
		else
		{
			hitResult = hitResultR.hit ? hitResultR : hitResultL;
		}

		if (hitResult.hit)
		{
			hitResult.color = this.appearance.GetLineColorHex();
			hitResult.BRDF = Phong;
			hitResult.roughness = 0;
			hitResult.metalness = 0;
			hitResult.intensity = 1;

			results.push(hitResult);
		}

		return results;
	}

	this.getSnapPoints = function ()
	{
		var points = [	{ type: "center", p: avg(this.p0, this.p1) },
						{ type: "node", p: this.p0 },
						{ type: "node", p: this.p1 },
					];

		if (this.drawCenters)
		{
			points.push( { type: "node", p: this.centerL } );
			points.push( { type: "node", p: this.centerR } );
		}

		if (this.drawFocus)
		{
			points.push( { type: "node", p: this.focusPointL } );
			points.push( { type: "node", p: this.focusPointR } );
		}

		return points;
	}

	this.getDragPoints = function(localSpace, camera)
	{
		if (this.isFrozen())
			return [];

		var points = [];

		points.push(this.p0);
		points.push(this.p1);

		if (this.drawCenters)
		{
			points.push(this.centerL);
			points.push(this.centerR);
		}

		if (this.drawFocus)
		{
			points.push(this.focusPointL);
			points.push(this.focusPointR);
		}

		return points;
	}

	this.drawDragPoint = function(camera, index, position, localSpace, alpha)
	{
		if (alpha == undefined)
			alpha = 1;

		camera.drawRectangle( position, camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
	}

	this.setDragPointPos = function(index, p, localSpace, dragStartPoint, camera)
	{
		if (index == 0)
		{
			this.p0 = p;
		}
		else if (index == 1)
		{
			this.p1 = p;
		}
		else if (index == 2 && this.drawCenters)
		{
			this.radiusR = distance(this.p0, p);

			if (this.symmetrical)
				this.radiusL = this.radiusR;
		}
		else if ( (index == 2 && !this.drawCenters) || index == 4 )
		{
			var H = distance(this.p0, this.p1) * 0.5;
			
			var F = distance(p, this.midPoint);

			var X = (-4*F + Math.sqrt(16*F*F + 12*H*H)) / 6;

			var R = 2 * (X + F);

			this.radiusR = R;

			if (this.symmetrical)
				this.radiusL = R;
		}
		else if (index == 3 && this.drawCenters)
		{
			this.radiusL = distance(this.p0, p);

			if (this.symmetrical)
				this.radiusR = this.radiusL;
		}
		else if ( (index == 3 && !this.drawCenters) || index == 5 )
		{
			var H = distance(this.p0, this.p1) * 0.5;
			
			var F = distance(p, this.midPoint);

			var X = (-4*F + Math.sqrt(16*F*F + 12*H*H)) / 6;

			var R = 2 * (X + F);

			this.radiusL = R;

			if (this.symmetrical)
				this.radiusR = R;
		}

		this.onChange();
	}

	this.getOrigin = function()
	{
		return this.p0;
	}
	
	this.setOrigin = function(p)
	{
		var delta = sub(this.p1, this.p0);
		this.p0 = p;
		this.p1 = add(this.p0, delta);
		this.onChange();
	}

	this.getProperties = function()
	{
		var appearanceControl = new PopoutContainer(undefined, "images/color_wheel.svg");
		{
			appearanceControl.addControl("", new AppearanceControl(this.appearance, true, true, function(){ this.onChange(); }.bind(this)) );
		}

		var properties = [];

		properties.push( {name: "Appearance", control:appearanceControl } );
		if (this.symmetrical)
		{
			properties.push( {name: "Radius", control: new Slider(Math.ceil(distance(this.p0, this.p1) * 0.5), 100, this.radiusL, 1, function (value) { this.radiusL = value; this.onChange(); }.bind(this)) } );
		}
		else
		{
			properties.push( {name: "Left Radius", control: new Slider(Math.ceil(distance(this.p0, this.p1) * 0.5), 100, this.radiusL, 1, function (value) { this.radiusL = value; this.onChange(); }.bind(this)) } );
			properties.push( {name: "Right Radius", control: new Slider(Math.ceil(distance(this.p0, this.p1) * 0.5), 100, this.radiusR, 1, function (value) { this.radiusR = value; this.onChange(); }.bind(this)) } );
		}
		properties.push( {name: "Symmetrical", control: new TickBox(this.symmetrical, function (value) { this.symmetrical = value; this.onChange({refreshProperties:true}); }.bind(this)) } );
		properties.push( {name: "Refraction Index", control: new Slider(1, 5, this.refractionIndex, 0.05, function (value) { this.refractionIndex = value; this.onChange(); }.bind(this)) } );
		properties.push( {name: "Center Points", control: new TickBox(this.drawCenters, function (value) { this.drawCenters = value; this.onChange(); }.bind(this)) } );
		//properties.push( {name: "Focus Points", control: new TickBox(this.drawFocus, function (value) { this.drawFocus = value; this.onChange(); }.bind(this)) } );

		return properties;
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
