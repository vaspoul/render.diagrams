// ----------------------------------------------------------------------------------------------------------------
// Dimension
// ----------------------------------------------------------------------------------------------------------------
function Dimension(A, B)
{
	var kAligned    = 0;
	var kHorizontal = 1;
	var kVertical   = 2;
	var kAngle      = 3;

	this.scene				= null;
	this.selected			= false;
	this.A					= A;
	this.B					= B;
	this.textPoint			= avg(A,B);
	this.center				= avg(A,B);	// for angles
	this.alignment			= kAligned;
	this.decimals			= 2;
	this.text				= "{value.toFixed(1)}cm";
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
		str += ");\n";

		str += this.appearance.saveAsJavascript("dim");
		str += "dim.textPoint = new Vector(" + this.textPoint.x + ", " + this.textPoint.y + ");\n";
		str += "dim.center = new Vector(" + this.center.x + ", " + this.center.y + ");\n";
		str += "dim.alignment = " + this.alignment + ";\n";
		str += "dim.lineOffset = " + this.lineOffset + ";\n";
		str += "dim.textOffset = " + this.textOffset + ";\n";
		str += "dim.text = \"" + this.text + "\";\n";
		str += "dim.visible = " + this.visible + ";\n";
		str += "dim.frozen = " + this.frozen + ";\n";

		if (this.name != undefined)
		{
			str += "dim.name = \"" + this.name + "\";\n";
		}

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

		var extensionLineDir;

		if (this.alignment == kHorizontal)
		{
			extensionLineDir = new Vector(0, -1);
		}
		else if (this.alignment == kVertical)
		{
			extensionLineDir = new Vector(1, 0);
		}
		else
		{
			extensionLineDir = transpose(sub(this.B, this.A).unit());
		}

		if (this.alignment == kAngle)
		{
			var radius = distance(this.textPoint, this.center);

			var dirA = sub(this.A, this.center).unit();
			var dirB = sub(this.B, this.center).unit();

			var pA = mad(dirA, radius, this.center);
			var pB = mad(dirB, radius, this.center);
			var pM = mad(avg(dirA, dirB).unit(), radius, this.center);

			this.boundsMin = pA;
			this.boundsMax = pA;

			this.boundsMin = min(pB, this.boundsMin);
			this.boundsMax = max(pB, this.boundsMax);

			this.boundsMin = min(pM, this.boundsMin);
			this.boundsMax = max(pM, this.boundsMax);
		}
		else
		{
			var offsetA = dot(sub(this.textPoint, this.A), extensionLineDir);
			var offsetB = dot(sub(this.textPoint, this.B), extensionLineDir);

			var pA1 = mad(extensionLineDir, offsetA, this.A);
			var pB1 = mad(extensionLineDir, offsetB, this.B);

			var t0 = dot(sub(this.textPoint, pA1), sub(pB1, pA1)) / distanceSqr(pB1, pA1);

			var pX1 = mad(sub(pB1, pA1), t0, pA1);

			this.boundsMin = this.A;
			this.boundsMax = this.A;

			this.boundsMin = min(this.B, this.boundsMin);
			this.boundsMax = max(this.B, this.boundsMax);

			this.boundsMin = min(pA1, this.boundsMin);
			this.boundsMax = max(pA1, this.boundsMax);

			this.boundsMin = min(pB1, this.boundsMin);
			this.boundsMax = max(pB1, this.boundsMax);

			this.boundsMin = min(pX1, this.boundsMin);
			this.boundsMax = max(pX1, this.boundsMax);
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

		if (this.alignment == kAngle)
		{
			var radius = distance(this.textPoint, this.center);

			var angleA = toAngle(sub(this.A, this.center));
			var angleB = toAngle(sub(this.B, this.center));

			var angleMin = Math.min(angleA, angleB);
			var angleMax = Math.max(angleA, angleB);

			camera.drawArc(this.center, radius, angleMin, angleMax, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), undefined, undefined, 20, 20)

			var text = this.text;

			var angleDeg = toDegrees(angleMax - angleMin);

			var value = angleDeg;

			var expr = /{(.*)}/.exec(this.text);

			var valueStr = "invalid expr";

			if (expr != null && expr.length == 2)
			{
				valueStr = eval(expr[1]);
			}

			text = this.text.replace(/{.*}/, valueStr );

			var textDir = sub(this.textPoint, this.center).unit();

			var textAnchor = mad( textDir, camera.invScale(5), this.textPoint);

			var textHAlign = (textDir.x > 0) ? "left" : "right";
			var textVAlign = (textDir.y > 0) ? "bottom" : "top";
			
			var textAngle = 0;

			camera.drawText(textAnchor, text, "#000000", textHAlign, textAngle, undefined, textVAlign);
		}
		else
		{
			var extensionLineDir;

			if (this.alignment == kHorizontal)
			{
				extensionLineDir = new Vector(0, -1);
			}
			else if (this.alignment == kVertical)
			{
				extensionLineDir = new Vector(1, 0);
			}
			else
			{
				extensionLineDir = transpose(sub(this.B, this.A).unit());
			}

			var offsetA = dot(sub(this.textPoint, this.A), extensionLineDir);
			var offsetB = dot(sub(this.textPoint, this.B), extensionLineDir);

			var pA0 = mad(extensionLineDir, Math.sign(offsetA) * camera.invScale(5), this.A);
			var pA1 = mad(extensionLineDir, offsetA, this.A);
			var pA2 = mad(extensionLineDir, offsetA + Math.sign(offsetA) * camera.invScale(5), this.A);

			var pB0 = mad(extensionLineDir, Math.sign(offsetB) * camera.invScale(5), this.B);
			var pB1 = mad(extensionLineDir, offsetB, this.B);
			var pB2 = mad(extensionLineDir, offsetB + Math.sign(offsetB) * camera.invScale(5), this.B);

			var t0 = dot(sub(this.textPoint, pA1), sub(pB1, pA1)) / distanceSqr(pB1, pA1);

			var pX0 = (t0>=1) ? pB1 : (t0<=0) ? pA1 : mad(sub(pB1, pA1), t0, pA1);
			var pX1 = mad(sub(pB1, pA1), t0, pA1);

			camera.drawLine(pA0, pA2, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected));
			camera.drawLine(pB0, pB2, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected));
			camera.drawLine(pX0, pX1, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected));

			camera.drawArrow(avg(pA1, pB1), pA1, 20, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected));
			camera.drawArrow(avg(pA1, pB1), pB1, 20, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected));

			var textAlign = "center";

			if (t0>1)
			{
				textAlign = "right";
			}
			else if (t0<0)
			{
				textAlign = "left";
			}

			var textAngle = toAngle(transpose(extensionLineDir));

			var factor = -1;

			if (textAngle > Math.PI / 2 || textAngle <= -Math.PI / 2)
			{
				textAngle -= Math.PI;
				factor = 1;
			}

			var textAnchor = this.textPoint;
			textAnchor = mad(extensionLineDir.neg(), factor * camera.invScale(5), textAnchor);

			var dist = distance(this.A, this.B);

			if (this.alignment == kHorizontal)
				dist = abs(this.A.x - this.B.x);
			else if (this.alignment == kVertical)
				dist = abs(this.A.y - this.B.y);

			var text = this.text;

			var value = dist;

			var expr = /{(.*)}/.exec(this.text);

			var valueStr = "invalid expr";

			if (expr != null && expr.length == 2)
			{
				valueStr = eval(expr[1]);
			}

			text = this.text.replace(/{.*}/, valueStr );

			camera.drawText(textAnchor, text, "#000000", textAlign, textAngle);
		}
	}
	
	this.hitTest = function(a, b, camera)
	{
		if (this.alignment == kAngle)
		{
			var radius = distance(this.textPoint, this.center);

			var angleA = toAngle(sub(this.A, this.center));
			var angleB = toAngle(sub(this.B, this.center));

			var angleMin = Math.min(angleA, angleB);
			var angleMax = Math.max(angleA, angleB);

			if (overlapRectArc(a, b, this.center, radius, angleMin, angleMax))
				return true;
		}
		else
		{
			var extensionLineDir;

			if (this.alignment == kHorizontal)
			{
				extensionLineDir = new Vector(0, -1);
			}
			else if (this.alignment == kVertical)
			{
				extensionLineDir = new Vector(1, 0);
			}
			else
			{
				extensionLineDir = transpose(sub(this.B, this.A).unit());
			}

			var offsetA = dot(sub(this.textPoint, this.A), extensionLineDir);
			var offsetB = dot(sub(this.textPoint, this.B), extensionLineDir);

			var pA1 = mad(extensionLineDir, offsetA, this.A);
			var pB1 = mad(extensionLineDir, offsetB, this.B);

			var pA2 = mad(extensionLineDir, offsetA + Math.sign(offsetA) * camera.invScale(5), this.A);
			var pB2 = mad(extensionLineDir, offsetB + Math.sign(offsetB) * camera.invScale(5), this.B);

			var t0 = dot(sub(this.textPoint, pA1), sub(pB1, pA1)) / distanceSqr(pB1, pA1);

			var pX0 = (t0>=1) ? pB1 : (t0<=0) ? pA1 : mad(sub(pB1, pA1), t0, pA1);
			var pX1 = mad(sub(pB1, pA1), t0, pA1);

			if (	overlapRectLine(a, b, this.A, pA2) ||
					overlapRectLine(a, b, this.B, pB2) ||
					overlapRectLine(a, b, pA2, pB2) ||
					overlapRectLine(a, b, pX0, pX1) )
				return true;
		}

		return false;
	}

	this.getSnapPoints = function ()
	{
		var points = [];

		points.push( { type: "node", p: this.A} );
		points.push( { type: "node", p: this.B} );

		if (this.alignment == kAngle)
		{
			points.push( { type: "node", p: this.center } );
		}
		else
		{
		}

		return points;
	}

	this.getDragPoints = function(localSpace, camera)
	{
		if (this.isFrozen())
			return [];

		var points = [ ];

		points.push( this.textPoint );
		points.push( this.A );
		points.push( this.B );

		if (this.alignment == kAngle)
		{
			points.push( this.center );
		}

		return points;
	}

	this.drawDragPoint = function(camera, index, position, localSpace, alpha)
	{
		if (alpha == undefined)
			alpha = 1;

		camera.drawRectangle(position, camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
	}

	this.setDragPointPos = function(index, p, localSpace, dragStartPoint, camera)
	{
		if (index == 0)
		{
			if (localSpace && this.alignment != kAngle)
			{
				if ( ( p.x <= Math.min(this.A.x, this.B.x) || p.x >= Math.max(this.A.x, this.B.x) ) && ( p.y >= Math.min(this.A.y, this.B.y) && p.y <= Math.max(this.A.y, this.B.y) ) )
				{
					this.alignment = kVertical;
				}
				else if ( ( p.y <= Math.min(this.A.y, this.B.y) || p.y >= Math.max(this.A.y, this.B.y) ) && ( p.x >= Math.min(this.A.x, this.B.x) && p.x <= Math.max(this.A.x, this.B.x) ) )
				{
					this.alignment = kHorizontal;
				}
				else
				{
					this.alignment = kAligned;
				}
			}

			this.textPoint = p;
		}
		else if (index == 1 || index == 2)
		{
			var textRelPos = dot( sub(this.textPoint, this.A), sub(this.B, this.A) ) / distanceSqr(this.A, this.B);
			var textOffset = dot( sub(this.textPoint, this.A), transpose( sub(this.B, this.A).unit() ) );

			if (this.alignment == kHorizontal)
				textRelPos = (this.textPoint.x - this.A.x) / (this.B.x - this.A.x);
			else if (this.alignment == kVertical)
				textRelPos = (this.textPoint.y - this.A.y) / (this.B.y - this.A.y);

			if (index == 1)
				this.A = p;
			else
				this.B = p;


			if (this.point1dir != undefined && this.point2dir != undefined)
			{
				var dirDot = dot(this.point1dir, this.point2dir);

				if (Math.abs(dirDot) != 1)
				{
					var rayDir = this.point1dir;

					var intersection = intersectRayRay(this.A, rayDir, this.B, this.point2dir, true);

					if (intersection.hit)
					{
						this.alignment = kAngle;
						this.center = intersection.P;

						if (this.pointCount == 1)
						{
							this.text = "{value.toFixed(0)}°";
							this.decimals = 0;
						}
					}
				}
			}

			if (this.alignment == kAligned)
			{
				this.textPoint = mad( sub(this.B, this.A), textRelPos, mad( transpose( sub(this.B, this.A).unit() ), textOffset, this.A ) );
			}
			else if (this.alignment == kHorizontal && textRelPos>=0 && textRelPos<=1)
			{
				this.textPoint.x = lerp(this.A.x, this.B.x, textRelPos);
			}
			else if (this.alignment == kVertical && textRelPos>=0 && textRelPos<=1)
			{
				this.textPoint.y = lerp(this.A.y, this.B.y, textRelPos);
			}
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
		this.textPoint = add(this.textPoint, delta);

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
					{ name: "Align", control: new Dropdown(["Aligned", "Horizontal", "Vertical", "Angle"], this.alignment, function (value) { this.alignment = value; this.onChange(); }.bind(this)) },
					{ name: "Decimals", control: new PopoutSlider(0, 5, this.decimals, 1, function (value) { this.decimals = value; this.onChange(); }.bind(this)) },
					{ name: "Text", control: new TextBox(this.text, true, false, 64, function (value) { this.text = value; this.onChange(); }.bind(this)) },
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
