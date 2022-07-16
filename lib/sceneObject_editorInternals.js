// ----------------------------------------------------------------------------------------------------------------
// Group object
// ----------------------------------------------------------------------------------------------------------------
function Group(objects)
{
	this.scene				= null;
	this.objects			= [];
	this.selected			= false;
	this.visible			= true;
	this.frozen				= false;
	this.onChangeListeners	= [];
	this.boundsMin			= new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
	this.boundsMax			= new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

	this.getBoundsMin = function ()
	{
		return this.boundsMin;
	}

	this.getBoundsMax = function()
	{
		return this.boundsMax;
	}

	this.addObject = function (object)
	{
		this.objects.push(object);

		var objectScene = object.scene;

		if (object.scene !== null)
		{
			object.scene.deleteObjects([object]);
		}

		this.objects[this.objects.length-1].scene = objectScene;

		if (object.addChangeListener !== null)
		{
			object.addChangeListener(this.onChange.bind(this));
		}

		this.onChange();
	}

	this.deleteObjects = function(objectList)
	{
		var index = this.scene.getObjectIndex(this);

		for (var i=0; i<this.objects.length; ++i)
		{
			if (objectList.indexOf(this.objects[i])>=0)
			{
				this.scene.addObject(this.objects[i], index);

				this.objects[i].selected = false;

				this.objects.splice(i, 1);
				--i;
				++index;
			}
		}

		if (this.objects.length == 0)
		{
			this.scene.deleteObjects([this]);
			return;
		}

		this.onChange();
	}

	this.deleteAllObjects = function()
	{
		this.deleteObjects(this.objects.slice(0));
	}

	this.saveAsJavascript = function ()
	{
		var objName = "g_" + Math.floor(Math.random() * 100000);
		var str = "var " + objName + " = new Group([]);\n";

		for (var i = 0; i != this.objects.length; ++i)
		{
			str += this.objects[i].saveAsJavascript();
			str += objName + ".addObject(scene.objects[scene.objects.length-1]);\n";
		}

		str += objName + ".visible = " + this.visible + ";\n";
		str += objName + ".frozen = " + this.frozen + ";\n";

		str += "scene.addObject(" + objName + ");\n";
		return str;
	}

	this.addChangeListener = function(listener)
	{
		this.onChangeListeners.push(listener);
	}

	this.onChange = function(changeDetails)
	{
		this.boundsMin = new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
		this.boundsMax = new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

		for (var i=0; i<this.objects.length; ++i)
		{
			if (this.objects[i].getBoundsMin !== undefined)
			{
				this.boundsMin = min(this.boundsMin, this.objects[i].getBoundsMin());
				this.boundsMax = max(this.boundsMax, this.objects[i].getBoundsMax());
			}
		}

		for (var i=0; i!=this.onChangeListeners.length; ++i)
		{
			this.onChangeListeners[i](this, changeDetails);
		}
	}
	
	this.draw = function(camera)
	{
		for (var i=0; i<this.objects.length; ++i)
		{
			this.objects[i].selected = this.selected;
			this.objects[i].draw(camera);
		}
	}
	
	this.hitTest = function(a, b, camera)
	{
		for (var i=0; i<this.objects.length; ++i)
		{
			if (this.objects[i].hitTest !== undefined && this.objects[i].hitTest(a,b) == true)
			{
				return true;
			}
		}
		
		return false;
	}
	
	this.rayHitTest = function(rayPos, rayDir)
	{
		var results = [];

		for (var i=0; i<this.objects.length; ++i)
		{
			if (this.objects[i].rayHitTest !== undefined)
			{
				results = results.concat( this.objects[i].rayHitTest(rayPos, rayDir) );
			}
		}

		return results;
	}

	this.getSnapPoints = function()
	{
		var snaps = [];

		for (var i=0; i<this.objects.length; ++i)
		{
			snaps = snaps.concat( this.objects[i].getSnapPoints() );
		}

		return snaps;
	}

	this.getDragPoints = function(localSpace, camera)
	{
		return [];
	}

	this.drawDragPoint = function(camera, index, position, localSpace, alpha)
	{
		if (alpha == undefined)
			alpha = 1;

	}

	this.setDragPointPos = function(index, p, localSpace, dragStartPoint, camera)
	{
	}

	this.getOrigin = function()
	{
		return this.objects[0].getOrigin();
	}
	
	this.setOrigin = function(p)
	{
		var delta = sub(p, this.objects[0].getOrigin());

		for (var i=0; i<this.objects.length; ++i)
		{
			this.objects[i].setOrigin(add(this.objects[i].getOrigin(), delta));
		}

		this.onChange();
	}

	this.transform = function(currentRect, newRect)
	{
		for (var i=0; i!=this.objects.length; ++i)
		{
			if (this.objects[i].transform != undefined)
			{
				this.objects[i].transform(currentRect, newRect);
			}
			else
			{
				var localCoord = new Vector(	dot(sub(this.objects[i].getOrigin(), currentRect.center), currentRect.scaledXAxis),
												dot(sub(this.objects[i].getOrigin(), currentRect.center), currentRect.scaledYAxis) );

				localCoord.x /= currentRect.scaledXAxis.lengthSqr();
				localCoord.y /= currentRect.scaledYAxis.lengthSqr();

				this.objects[i].setOrigin( add(mad(localCoord.x, newRect.scaledXAxis, newRect.center), mul(localCoord.y, newRect.scaledYAxis)) );
			}
		}

		this.onChange();
	}

	this.getProperties = function()
	{
		// Build a list of common properties
		// We need an array of {name, control} pairs. This will come from the first object in the selection list
		// We'll then need a list of additional controls for each property to replicate the changes to

		var commonProperties = this.objects[0].getProperties().filter(function(element) { return element != undefined; } );
		var additionalControls = []; // same size as commonProperties with each entry being an array of additional controls we need to update

		for (var p=0; p<commonProperties.length; ++p)
		{
			additionalControls.push([]); // Start with no additional controls
		}

		for (var i=1; i<this.objects.length; ++i)
		{
			var objectProperties = this.objects[i].getProperties().filter(function(element) { return element != undefined; } );

			for (var p=0; p<commonProperties.length; ++p)
			{
				var found = false;

				for (var j=0; j<objectProperties.length; ++j)
				{
					if (commonProperties[p].name == objectProperties[j].name && typeof(commonProperties[p].control) == typeof(objectProperties[j].control) )
					{
						// Add control to list of dependent controls
						additionalControls[p].push( objectProperties[j].control );
						found = true;
						break;
					}
				}

				if (!found)
				{
					commonProperties.splice(p, 1);
					additionalControls.splice(p, 1);
					--p;
				}
			}
		}

		for (var p=0; p<commonProperties.length; ++p)
		{
			(function()
			{
				var additionalControls2 = additionalControls[p];
				var sourceControl = commonProperties[p].control;

				var callback = function()
				{
					for (additionalControl of additionalControls2)
					{
						if (additionalControl.copyFrom != undefined)
						{
							additionalControl.copyFrom( sourceControl );
						}
					}
				};

				commonProperties[p].control.addCallback( callback );

			})();
		}

		return commonProperties;
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

	for (var i=0; i!=objects.length; ++i)
	{
		this.addObject(objects[i]);
	}
}

// ----------------------------------------------------------------------------------------------------------------
// Regular grid
// ----------------------------------------------------------------------------------------------------------------
function Grid()
{
	this.O 			= new Vector(0,0);
	this.spacing	= 1;
	this.appearance	= new Appearance("#99D9EA", 0.5);
	this.type		= 0;//"cartesian";
	this.allowSnap	= true;
	
	//this.saveAsJavascript = function()
	//{
	//	var str = "var grid = new Grid(";

	//	str += "new Vector(" + this.O.x + ", " + this.O.y + ")";
	//	str += ", " + this.spacing;
	//	str += ", \"" + this.appearance.GetLineColor() + "\"";
	//	str += ", " + this.width;
	//	str += ", [" + this.dash + "]";
	//	str += ");\n";

	//	str += "scene.addObject(grid);\n";
	//	return str;
	//}

	this.getSnapPoint = function(p)
	{
		var result;

		if (this.allowSnap)
		{
			if (this.type == 0)//"cartesian")
			{
				result = mul(round(div(p, this.spacing)), this.spacing);
			}
			else if (this.type == 1)//"isometric")
			{
				var axis1 = fromAngle(30 * Math.PI / 180);
				var axis2 = fromAngle(150 * Math.PI / 180);
				var dotAxis1 = fromAngle(60 * Math.PI / 180);
				var dotAxis2 = fromAngle(120 * Math.PI / 180);
				var dotSpacing = this.spacing * Math.cos(30 * Math.PI / 180);

				result = new Vector(0, 0);
				result = mad(axis1, Math.round(dot(p, dotAxis1) / dotSpacing) * this.spacing, result);
				result = mad(axis2, Math.round(dot(p, dotAxis2) / dotSpacing) * this.spacing, result);
			}
			else if (this.type == 2)//"radial")
			{
				var radius = Math.round(length(p) / this.spacing) * this.spacing;

				var angleStep = Math.min(5, 20 / this.spacing);

				var angle = toAngle(p) * 180 / Math.PI;

				angle = Math.round(angle / angleStep) * angleStep;

				result = mad(fromAngle(angle * Math.PI / 180), radius, this.O);
			}
		}

		return result;
	}

	this.draw = function(camera)
	{
		var l = Math.floor( (this.O.x + camera.getViewPosition().x - camera.getViewSize().x/2) / this.spacing ) * this.spacing;
		var r = Math.floor( (this.O.x + camera.getViewPosition().x + camera.getViewSize().x/2) / this.spacing + 1) * this.spacing;
		var b = Math.floor( (this.O.y + camera.getViewPosition().y - camera.getViewSize().y/2) / this.spacing ) * this.spacing;
		var t = Math.floor( (this.O.y + camera.getViewPosition().y + camera.getViewSize().y/2) / this.spacing + 1) * this.spacing;

		if (this.type == 0)//"cartesian")
		{
			var points = [];

			for (var x=l; x<=r; x+=this.spacing)
			{
				points.push(new Vector(x, b));
				points.push(new Vector(x, t));
			}
	
			for (var y=b; y<=t; y+=this.spacing)
			{
				points.push(new Vector(l, y));
				points.push(new Vector(r, y));
			}

			camera.drawLines(points, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected));
			camera.drawLine(new Vector(l, this.O.y), new Vector(r, this.O.y), this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected)*2);
			camera.drawLine(new Vector(this.O.x, b), new Vector(this.O.x, t), this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected)*2);
		}
		else if (this.type == 1)//"isometric")
		{
			var axis = fromAngle(30 * Math.PI / 180);

			var TL = new Vector(l, t);
			var TR = new Vector(r, t);
			var BL = new Vector(l, b);
			var BR = new Vector(r, b);

			var count = Math.ceil(dot(sub(TR, BL), axis) / this.spacing);
			var stepX = 2 * this.spacing * Math.cos(30 * Math.PI / 180);
			var stepY = 2 * this.spacing * Math.sin(30 * Math.PI / 180);

			var points = [];

			for (var i = 0; i < count; ++i)
			{
				points.push(new Vector(Math.floor(l/stepX)*stepX, Math.floor(b/stepY)*stepY+i*stepY));
				points.push(new Vector(Math.floor(l/stepX)*stepX+i*stepX, Math.floor(b/stepY)*stepY));
			}

			for (var i = 0; i < count; ++i)
			{
				points.push(new Vector(Math.ceil(r/stepX)*stepX, Math.floor(b/stepY)*stepY+i*stepY));
				points.push(new Vector(Math.ceil(r/stepX)*stepX-i*stepX, Math.floor(b/stepY)*stepY));
			}

			camera.drawLines(points, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected));

			axis = fromAngle(60 * Math.PI / 180);

			camera.drawLine(new Vector(this.O.x + (this.O.y - Math.floor(b / stepY) * stepY) / axis.x * axis.y, Math.floor(b / stepY) * stepY),
								new Vector(Math.floor(l/stepX)*stepX, this.O.y + (this.O.x-Math.floor(l/stepX)*stepX)/axis.y*axis.x), 
								this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected)*2);

			camera.drawLine(	new Vector(this.O.x - (this.O.y-Math.floor(b/stepY)*stepY)/axis.x*axis.y, Math.floor(b/stepY)*stepY),
								new Vector(Math.ceil(r/stepX)*stepX, this.O.y + (Math.ceil(r/stepX)*stepX-this.O.x)/axis.y*axis.x), 
								this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected)*2);
		}
		else if (this.type == 2)//"radial")
		{
			var TL = new Vector(l, t);
			var TR = new Vector(r, t);
			var BL = new Vector(l, b);
			var BR = new Vector(r, b);

			var maxRadius = Math.max(Math.max(length(TL), length(TR)), Math.max(length(BL), length(BR)));

			maxRadius = Math.round(maxRadius / this.spacing) * this.spacing;

			for (var r=this.spacing; r<=maxRadius; r+=this.spacing)
			{
				camera.drawArc(this.O, r, 0, Math.PI*2, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected));
			}

			var angleStep = Math.min(5, 20 / this.spacing);

			var points = [];

			for (var a = 0; a <= 360; a += angleStep)
			{
				points.push(this.O);
				points.push(mad(fromAngle(a*Math.PI/180), maxRadius, this.O));
			}

			camera.drawLines(points, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected));

			camera.drawCross(this.O, camera.invScale(10), 0, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected)*2);
		}
	}
}

// ----------------------------------------------------------------------------------------------------------------
// Bitmap
// ----------------------------------------------------------------------------------------------------------------
function Bitmap(origin, pixelWidth, pixelHeight, pixelValues)
{
	this.scene				= null;
	this.origin				= origin;
	this.img				= undefined;
	this.drawWidth			= 1;
	this.drawHeight			= this.drawWidth * pixelHeight / pixelWidth;
	this.pixelWidth			= pixelWidth;
	this.pixelHeight		= pixelHeight;
	this.rotation			= 0;
	this.alpha				= 1;

	this.selected			= false;
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
		var str = "var image = new Image();\n";


		str += "text.visible = " + this.visible + ";\n";
		str += "text.frozen = " + this.frozen + ";\n";
		str += "text.maxWidth = " + this.maxWidth + ";\n";
		str += "text.totalHeight = " + this.totalHeight + ";\n";

		str += "scene.addObject(axis);\n";
		return str;
	}

	this.setPixelData = function(pixelWidth, pixelHeight, pixelValues)
	{
		this.pixelWidth = pixelWidth;
		this.pixelHeight = pixelHeight;

		var canvas = document.createElement("canvas");
		canvas.width = pixelWidth;
		canvas.height = pixelHeight;
		var ctx = canvas.getContext("2d");
		
		var imageData = ctx.createImageData(pixelWidth, pixelHeight);

		var i = 0;

		if (pixelValues.length == (pixelWidth * pixelHeight * 1))
		{
			for (var y=0; y<pixelHeight; ++y)
			{
				for (var x=0; x<pixelWidth; ++x)
				{
					imageData.data[y*pixelWidth*4 + x*4 + 0] = pixelValues[i];
					imageData.data[y*pixelWidth*4 + x*4 + 1] = pixelValues[i];
					imageData.data[y*pixelWidth*4 + x*4 + 2] = pixelValues[i];
					imageData.data[y*pixelWidth*4 + x*4 + 3] = 255;
					++i;
				}
			}
		}
		else if (pixelValues.length == (pixelWidth * pixelHeight * 3))
		{
			for (var y=0; y<pixelHeight; ++y)
			{
				for (var x=0; x<pixelWidth; ++x)
				{
					imageData.data[y*pixelWidth*4 + x*4 + 0] = pixelValues[i+0];
					imageData.data[y*pixelWidth*4 + x*4 + 1] = pixelValues[i+1];
					imageData.data[y*pixelWidth*4 + x*4 + 2] = pixelValues[i+2];
					imageData.data[y*pixelWidth*4 + x*4 + 3] = 255;
					i+=3;
				}
			}
		}
		else if (pixelValues.length == (pixelWidth * pixelHeight * 4))
		{
			for (var y=0; y<pixelHeight; ++y)
			{
				for (var x=0; x<pixelWidth; ++x)
				{
					imageData.data[y*pixelWidth*4 + x*4 + 0] = pixelValues[i+0];
					imageData.data[y*pixelWidth*4 + x*4 + 1] = pixelValues[i+1];
					imageData.data[y*pixelWidth*4 + x*4 + 2] = pixelValues[i+2];
					imageData.data[y*pixelWidth*4 + x*4 + 3] = pixelValues[i+3];
					i+=4;
				}
			}
		}
		else
		{
			for (var y=0; y<pixelHeight; ++y)
			{
				for (var x=0; x<pixelWidth; ++x)
				{
					imageData.data[y*pixelWidth*4 + x*4 + 0] = 0;
					imageData.data[y*pixelWidth*4 + x*4 + 1] = 0;
					imageData.data[y*pixelWidth*4 + x*4 + 2] = 0;
					imageData.data[y*pixelWidth*4 + x*4 + 3] = 255;
					i+=4;
				}
			}
		}

		ctx.putImageData(imageData, 0, 0);

		this.image = new Image();
		this.image.onload = function () { this.onChange(); }.bind(this);
		this.image.src = canvas.toDataURL("image/png");
	}

	this.addChangeListener = function(listener)
	{
		this.onChangeListeners.push(listener);
	}

	this.onChange = function(changeDetails)
	{
		for (var i=0; i!=this.onChangeListeners.length; ++i)
		{
			this.onChangeListeners[i](this, changeDetails);
		}
	}
	
	this.draw = function(camera)
	{
		camera.drawImage(this.origin, this.image, this.drawWidth, this.drawHeight, this.rotation, this.alpha);
	}
	
	this.hitTest = function(a, b, camera)
	{
		//overlapRectOBB(a,b, [p0,p1,p2,p3]))

		return false;
	}

	this.getSnapPoints = function ()
	{
		var points = [ ];
		return points;
	}

	this.getDragPoints = function(localSpace, camera)
	{
		return [];
	}

	this.drawDragPoint = function(camera, index, position, localSpace, alpha)
	{
		if (alpha == undefined)
			alpha = 1;

	}

	this.setDragPointPos = function(index, p, localSpace, dragStartPoint, camera)
	{
	}

	this.getOrigin = function()
	{
		return this.origin;
	}
	
	this.setOrigin = function(p)
	{
		this.origin = p;
	}

	this.getProperties = function()
	{
		return	[];
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

	this.setPixelData(pixelWidth, pixelHeight, pixelValues);
}

// ----------------------------------------------------------------------------------------------------------------
// Mouse cursor
// ----------------------------------------------------------------------------------------------------------------
function MouseCursor(grid)
{
	this.grid = grid;
	this.pos = new Vector(0,0);
	this.snap = false;
	this.shape = "cross";
	this.hide = false;
	
	this.draw = function(camera)
	{
		if (this.hide)
			return;

		if (this.shape == "cross")
		{
			camera.drawCross(this.pos, camera.invScale(10), 45 * Math.PI/180);
		}
		else if (this.shape == "angle")
		{
			var delta = new Vector(15,0);
				
			delta = camera.invScale(delta);
			
			delta = rotate(delta, -20 * Math.PI/180);

			camera.drawLine(this.pos, add(this.pos, delta));

			delta = rotate(delta, -50 * Math.PI / 180);

			camera.drawLine(this.pos, add(this.pos, delta));
		}

	}
}

// ----------------------------------------------------------------------------------------------------------------
// ScreenshotArea
// ----------------------------------------------------------------------------------------------------------------
function ScreenshotArea(p, okCallback, cancelCallback)
{
	this.points			= [p.copy(), p.copy(), p.copy(), p.copy()];
	this.scene			= null;
	this.selected		= false;
	this.DPI			= 96;
	this.formatIndex	= 0;
	this.CMperUnit		= 0.5;
	this.copiesRows		= 1;
	this.copiesColumns	= 1;
	this.includeGridlines = true;

	this.draw = function(camera)
	{
		var width = 2;

		var l = camera.getViewPosition().x - camera.getViewSize().x/2;
		var r = camera.getViewPosition().x + camera.getViewSize().x/2;
		var b = camera.getViewPosition().y - camera.getViewSize().y/2;
		var t = camera.getViewPosition().y + camera.getViewSize().y/2;

		var pmax = max(this.points[0], this.points[2]);
		var pmin = min(this.points[0], this.points[2]);

		var ra = new Vector(pmin.x, pmax.y);
		var rb = new Vector(pmax.x, pmin.y);

		camera.drawRectangle(new Vector(l,t), new Vector(ra.x, ra.y), "rgba(0,0,0,0.5)", 1, [], "rgba(0,0,0,0.5)");
		camera.drawRectangle(new Vector(ra.x,t), new Vector(rb.x, ra.y), "rgba(0,0,0,0.5)", 1, [], "rgba(0,0,0,0.5)");
		camera.drawRectangle(new Vector(rb.x,t), new Vector(r, ra.y), "rgba(0,0,0,0.5)", 1, [], "rgba(0,0,0,0.5)");

		camera.drawRectangle(new Vector(l,ra.y), new Vector(ra.x, rb.y), "rgba(0,0,0,0.5)", 1, [], "rgba(0,0,0,0.5)");
		camera.drawRectangle(new Vector(rb.x,ra.y), new Vector(r, rb.y), "rgba(0,0,0,0.5)", 1, [], "rgba(0,0,0,0.5)");

		camera.drawRectangle(new Vector(l,b), new Vector(ra.x, rb.y), "rgba(0,0,0,0.5)", 1, [], "rgba(0,0,0,0.5)");
		camera.drawRectangle(new Vector(ra.x,b), new Vector(rb.x, rb.y), "rgba(0,0,0,0.5)", 1, [], "rgba(0,0,0,0.5)");
		camera.drawRectangle(new Vector(rb.x,b), new Vector(r, rb.y), "rgba(0,0,0,0.5)", 1, [], "rgba(0,0,0,0.5)");

		camera.drawLineStrip(this.points, true, "#FF0000", width, []);
	}

	this.hitTest = function(a, b, camera)
	{
		if (	overlapRectLine(a, b, this.points[0], this.points[1]) ||
				overlapRectLine(a, b, this.points[1], this.points[2]) ||
				overlapRectLine(a, b, this.points[2], this.points[3]) ||
				overlapRectLine(a, b, this.points[3], this.points[0]))
		{
			return true;
		}
	}

	this.getDragPoints = function(localSpace, camera)
	{
		var points = [	this.points[0],
						this.points[1],
						this.points[2],
						this.points[3],
						avg(this.points[0], this.points[1]),
						avg(this.points[1], this.points[2]),
						avg(this.points[2], this.points[3]),
						avg(this.points[3], this.points[0])];

		return points;
	}

	this.drawDragPoint = function(camera, index, position, localSpace, alpha)
	{
		if (alpha == undefined)
			alpha = 1;

		if (index<4)
		{
			camera.drawRectangle(this.points[index], camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
		}
		else
		{
			var index0 = index-4;
			var index1 = (index0+1) % 4;

			var a = avg(this.points[index0], this.points[index1]);
			var dir = sub(this.points[index1], this.points[index0]).unit();
			var tan = transpose(dir);
	
			var b = add(a, mul(tan, camera.invScale(30)));

			camera.drawArrow(a, b, 8, "rgba(255,0,0," + alpha + ")", 3);
		}
	}

	this.setDragPointPos = function(index, p, localSpace, dragStartPoint, camera)
	{
		var points = [	this.points[0],
						this.points[1],
						this.points[2],
						this.points[3],
						avg(this.points[0], this.points[1]),
						avg(this.points[1], this.points[2]),
						avg(this.points[2], this.points[3]),
						avg(this.points[3], this.points[0])];

		if (index < 4)
		{
			if (localSpace)
			{
				var center = avg(this.points[0], this.points[2]);
				var halfSize = abs(sub(p, center));

				this.points[0] = sub(center, halfSize);
				this.points[2] = add(center, halfSize);
				this.points[1].x = this.points[2].x;
				this.points[1].y = this.points[0].y;
				this.points[3].x = this.points[0].x;
				this.points[3].y = this.points[2].y;
			}
			else
			{
				this.points[index] = p;

				if (index==0)
				{
					this.points[3].x = p.x;
					this.points[1].y = p.y;
				}
				else if (index==1)
				{
					this.points[2].x = p.x;
					this.points[0].y = p.y;
				}
				else if (index==2)
				{
					this.points[1].x = p.x;
					this.points[3].y = p.y;
				}
				else if (index==3)
				{
					this.points[0].x = p.x;
					this.points[2].y = p.y;
				}
			}
		}
		else if (index < 8)
		{
			if (index==4)
			{
				this.points[0].y = p.y;
				this.points[1].y = p.y;
			}
			else if (index==5)
			{
				this.points[1].x = p.x;
				this.points[2].x = p.x;
			}
			else if (index==6)
			{
				this.points[2].y = p.y;
				this.points[3].y = p.y;
			}
			else if (index==7)
			{
				this.points[0].x = p.x;
				this.points[3].x = p.x;
			}
		}
		else
		{ }

		if (camera != undefined)
		{
			var p0 = this.points[0].copy();
			var p1 = this.points[2].copy();

			var delta = sub(p1, p0);

			var p = p1.copy();
			p.x += ((p1.x < p0.x) ? +1 : -1) * camera.invScale(10);
			p.y += camera.invScale(10);

			camera.drawText(p, "dx: " + delta.x.toFixed(1) + " dy: " + delta.y.toFixed(1), "#000000", (p1.x < p0.x) ? "left" : "right", 0, "12px Arial");
		}
	}

	this.getOrigin = function()
	{
		return this.points[0];
	}
	
	this.setOrigin = function(p)
	{
		var delta = sub(p, this.points[0]);

		for (var i = 0; i != 4; ++i)
		{
			this.points[i] = add(this.points[i], delta);
		}
	}

	this.getProperties = function()
	{
		return	[
					{ name: "Format", control: new Dropdown(["PNG", "SVG"], this.formatIndex, function (value) { this.formatIndex = value; }.bind(this)) },
					{ name: "DPI", control: new PopoutSlider(40, 256, this.DPI, 8, function (value) { this.DPI = value; }.bind(this)) },
					{ name: "cm per Unit", control: new PopoutSlider(0.25, 4, this.CMperUnit, 0.25, function (value) { this.CMperUnit = value; }.bind(this)) },
					{ name: "Copies - Rows", control: new PopoutSlider(1, 4, this.copiesRows, 1, function (value) { this.copiesRows = value; }.bind(this)) },
					{ name: "Copies - Columns", control: new PopoutSlider(1, 4, this.copiesColumns, 1, function (value) { this.copiesColumns = value; }.bind(this)) },
					{ name: "Include Gridlines", control: new TickBox(this.includeGridlines, function (value) { this.includeGridlines = value; }.bind(this)) },
					{ name: undefined, control: new Divider() },
					{ name: undefined, control: new PlainButton("Popup", function () { this.onPopupClicked(); }.bind(this)) },
					{ name: undefined, control: new PlainButton("Save", function () { this.onSaveClicked(); }.bind(this)) },
					{ name: undefined, control: new PlainButton("Cancel", cancelCallback) },
				];
	}

	this.toggleVisibility = function(v)
	{}

	this.isVisible = function()
	{
		return true;
	}

	this.toggleFrozen = function(f)
	{}

	this.isFrozen = function()
	{
		return false;
	}

	this.setSelected = function(selected)
	{
		this.selected = selected;
	}

	this.isSelected = function()
	{
		return this.selected;
	}

	this.onPopupClicked = function()
	{
		okCallback(this.formatIndex, true, this.includeGridlines);
	}

	this.onSaveClicked = function()
	{
		okCallback(this.formatIndex, false, this.includeGridlines);
	}
}

// ----------------------------------------------------------------------------------------------------------------
//	TransformRect
// ----------------------------------------------------------------------------------------------------------------
function TransformRect(objects)
{
	this.boundsMin;
	this.boundsMax;
	this.angle			= 0;
	this.points			= [];
	this.pivot;
	this.scene			= null;
	this.objects		= objects;
	this.dragStartRect;

	this.updateExtents = function(updatePivot)
	{
		if (updatePivot == undefined)
		{
			updatePivot = false;
		}

		this.boundsMin = new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
		this.boundsMax = new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

		var rotMtxCol0 = new Vector( Math.cos(this.angle * Math.PI / 180), Math.sin(this.angle * Math.PI / 180));
		var rotMtxCol1 = new Vector(-Math.sin(this.angle * Math.PI / 180), Math.cos(this.angle * Math.PI / 180));
		
		var rotMtxCol0abs = abs(rotMtxCol0); 
		var rotMtxCol1abs = abs(rotMtxCol1); 

		for (var i=0; i<this.objects.length; ++i)
		{
			if (this.objects[i].getBoundsMin !== undefined)
			{
				var objCenter = avg(this.objects[i].getBoundsMin(), this.objects[i].getBoundsMax());
				var objExtents = sub(this.objects[i].getBoundsMax(), this.objects[i].getBoundsMin());

				objCenter = new Vector(dot(objCenter, rotMtxCol0), dot(objCenter, rotMtxCol1));
				objExtents = new Vector(dot(objExtents, rotMtxCol0abs), dot(objExtents, rotMtxCol1abs));

				this.boundsMin = min(this.boundsMin, mad(objExtents, -0.5, objCenter));
				this.boundsMax = max(this.boundsMax, mad(objExtents, +0.5, objCenter));
			}
		}
			
		this.points	= [ new Vector(this.boundsMin.x, this.boundsMax.y), new Vector(this.boundsMax.x, this.boundsMax.y), new Vector(this.boundsMax.x, this.boundsMin.y), new Vector(this.boundsMin.x, this.boundsMin.y) ];

		for (var i = 0; i != this.points.length; ++i)
		{
			this.points[i] = rotate(this.points[i], this.angle * Math.PI / 180);
		}

		if (updatePivot)
		{
			this.pivot = avg(this.points[0], this.points[2]);
		}
	}

	this.setObjects = function(objects)
	{
		this.objects = objects;
		this.updateExtents();
	}

	this.startDrag = function()
	{
		this.dragStartRect = this.getRect();
	}

	this.getRect = function()
	{
		var result = 
		{
			center : this.points[3],
			scaledXAxis : sub(this.points[2], this.points[3]),
			scaledYAxis : sub(this.points[0], this.points[3])
		};

		return result;
	}

	this.draw = function(camera)
	{
		camera.drawLineStrip(this.points, true, "#0084e0", 1, [5,5]);

		camera.drawArrow(this.pivot, add(this.pivot, rotate(new Vector(camera.invScale(70), 0), this.angle * Math.PI / 180)), 20, "#FF0000", 2);
		camera.drawArrow(this.pivot, add(this.pivot, rotate(new Vector(0, camera.invScale(70)), this.angle * Math.PI / 180)), 20, "#00FF00", 2);
	}


	this.getSnapPoints = function()
	{
		var snaps = [];

		snaps.push({ type: "node", p: avg(this.points[0], this.points[2]) });

		return snaps;
	}

	this.getDragPoints = function(localSpace, camera)
	{
		var points = [	this.points[0],
						this.points[1],
						this.points[2],
						this.points[3],
						avg(this.points[0], this.points[1]),
						avg(this.points[1], this.points[2]),
						avg(this.points[2], this.points[3]),
						avg(this.points[3], this.points[0]),
						this.pivot];

		for (var i = 0; i < 8; ++i)
		{
			points.push(add(this.pivot, rotate(new Vector(camera.invScale(70), 0), (this.angle + i*360/8) * Math.PI / 180)));
		}

		// Copy the drag points of all contained objects as well. They can be used for rotation.
		for (var i=0; i<this.objects.length; ++i)
		{
			if (this.objects[i].getDragPoints !== undefined)
			{
				points = points.concat(this.objects[i].getDragPoints(localSpace, camera));
			}
		}

		return points;
	}

	this.drawDragPoint = function(camera, index, position, localSpace, alpha)
	{
		if (alpha == undefined)
			alpha = 1;

		var points = this.getDragPoints(localSpace, camera);

		camera.drawRectangle(points[index], camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);

		if (index>=9 && index<17)
		{
			camera.drawArc(this.pivot, camera.invScale(70), 0, Math.PI*2, "rgba(255,0,0," + alpha + ")", 2, undefined, [5,5]);
		}
	}

	this.setDragPointPos = function(index, p, localSpace, alt, ctrl, shift)
	{
		// corners
		if (index < 4)
		{
			if (ctrl)	// rotate
			{
				var oldAngle = this.angle;

				var pointAngle1 = toAngle(sub(this.points[index], this.pivot)) * 180 / Math.PI
				var pointAngle2 = toAngle(sub(avg(this.points[1], this.points[2]), this.pivot)) * 180 / Math.PI;
				
				var pointAngle = pointAngle1 - pointAngle2;

				this.angle = toAngle(sub(p, this.pivot)) * 180 / Math.PI;
				this.angle -= pointAngle;

				for (var i=0; i!=4; ++i)
				{
					this.points[i] = add(this.pivot, rotate(sub(this.points[i], this.pivot), (this.angle-oldAngle) * Math.PI / 180));
				}
			}
			else // scale
			{
				var xAxis = rotate(new Vector(1, 0), this.angle * Math.PI / 180);
				var yAxis = rotate(new Vector(0, 1), this.angle * Math.PI / 180);

				var keepAspect = !alt;
				var symmetrical = shift;

				if (keepAspect)
				{
					var u = sub(this.points[index], this.pivot).unit();
					var t = dot(sub(p, this.pivot), u);
					p = mad(u, t, this.pivot);
				}

				if (symmetrical)
				{
					this.points[index] = p;

					this.points[(index+2)%4] = sub(this.pivot, sub(p, this.pivot));

					if (index==0 || index==2)
					{
						this.points[(index+1)%4] = sub(this.pivot, reflect(sub(p, this.pivot), yAxis));
						this.points[(index+3)%4] = sub(this.pivot, reflect(sub(p, this.pivot), xAxis));
					}
					else if (index==1 || index==3)
					{
						this.points[index-1] = sub(this.pivot, reflect(sub(p, this.pivot), yAxis));
						this.points[(index+1)%4] = sub(this.pivot, reflect(sub(p, this.pivot), xAxis));
					}
				}
				else
				{
					this.points[index] = p;
					this.pivot = avg(this.points[index], this.points[(index+2)%4]);

					if (index==0 || index==2)
					{
						this.points[(index+1)%4] = sub(this.pivot, reflect(sub(p, this.pivot), yAxis));
						this.points[(index+3)%4] = sub(this.pivot, reflect(sub(p, this.pivot), xAxis));
					}
					else if (index==1 || index==3)
					{
						this.points[index-1] = sub(this.pivot, reflect(sub(p, this.pivot), yAxis));
						this.points[(index+1)%4] = sub(this.pivot, reflect(sub(p, this.pivot), xAxis));
					}
				}
			}

			this.transformObjects();
		}
		else if (index < 8)	// edges
		{
			var xAxis = rotate(new Vector(1, 0), this.angle * Math.PI / 180);
			var yAxis = rotate(new Vector(0, 1), this.angle * Math.PI / 180);

			var keepAspect = !alt;
			var symmetrical = shift;

			if (symmetrical)
			{
				if (index==4 || index==6)
				{
					var deltaX = mul(dot(sub(this.points[1], this.pivot), xAxis), xAxis);

					var sign = (index==4) ? 1 : -1;

					this.points[0] = sub(mad(sign * dot(sub(p, this.pivot), yAxis), yAxis, this.pivot), deltaX);
					this.points[1] = add(mad(sign * dot(sub(p, this.pivot), yAxis), yAxis, this.pivot), deltaX);
					this.points[2] = add(mad(-sign * dot(sub(p, this.pivot), yAxis), yAxis, this.pivot), deltaX);
					this.points[3] = sub(mad(-sign * dot(sub(p, this.pivot), yAxis), yAxis, this.pivot), deltaX);
				}
				else if (index==5 || index==7)
				{
					var deltaY = mul(dot(sub(this.points[1], this.pivot), yAxis), yAxis);

					var sign = (index==5) ? 1 : -1;

					this.points[0] = add(mad(-sign * dot(sub(p, this.pivot), xAxis), xAxis, this.pivot), deltaY);
					this.points[1] = add(mad(sign * dot(sub(p, this.pivot), xAxis), xAxis, this.pivot), deltaY);
					this.points[2] = sub(mad(sign * dot(sub(p, this.pivot), xAxis), xAxis, this.pivot), deltaY);
					this.points[3] = sub(mad(-sign * dot(sub(p, this.pivot), xAxis), xAxis, this.pivot), deltaY);
				}
			}
			else
			{
				if (index==4)
				{
					this.points[0] = mad(dot(sub(p, this.points[3]), yAxis), yAxis, this.points[3]);
					this.points[1] = mad(dot(sub(p, this.points[3]), yAxis), yAxis, this.points[2]);
				}
				else if (index==5)
				{
					this.points[1] = mad(dot(sub(p, this.points[3]), xAxis), xAxis, this.points[0]);
					this.points[2] = mad(dot(sub(p, this.points[3]), xAxis), xAxis, this.points[3]);
				}
				else if (index==6)
				{
					this.points[2] = mad(dot(sub(p, this.points[0]), yAxis), yAxis, this.points[1]);
					this.points[3] = mad(dot(sub(p, this.points[0]), yAxis), yAxis, this.points[0]);
				}
				else if (index==7)
				{
					this.points[0] = mad(dot(sub(p, this.points[1]), xAxis), xAxis, this.points[1]);
					this.points[3] = mad(dot(sub(p, this.points[1]), xAxis), xAxis, this.points[2]);
				}

				this.pivot = avg(this.points[0], this.points[2]);
			}

			this.transformObjects();
		}
		else if (index==8) // pivot
		{
			this.setOrigin(p);
		}
		else if (index>=9 && index<17) // pivot rotation
		{
			this.angle = toAngle(sub(p, this.pivot)) * 180 / Math.PI;

			this.angle -= (index-9)*360/8;

			this.updateExtents(false);
		}
		else // rotation via object drag point
		{}
	}

	this.transformObjects = function()
	{
		var newRect = this.getRect();

		for (var i=0; i!=this.objects.length; ++i)
		{
			if (this.objects[i].transform != undefined)
			{
				this.objects[i].transform(this.dragStartRect, newRect);
			}
			else
			{
				var localCoord = new Vector(	dot(sub(this.objects[i].getOrigin(), this.dragStartRect.center), this.dragStartRect.scaledXAxis),
												dot(sub(this.objects[i].getOrigin(), this.dragStartRect.center), this.dragStartRect.scaledYAxis) );

				localCoord.x /= this.dragStartRect.scaledXAxis.lengthSqr();
				localCoord.y /= this.dragStartRect.scaledYAxis.lengthSqr();

				this.objects[i].setOrigin( add(mad(localCoord.x, newRect.scaledXAxis, newRect.center), mul(localCoord.y, newRect.scaledYAxis)) );
			}
		}

		this.dragStartRect = newRect;
	}

	this.getOrigin = function()
	{
		return this.pivot;
	}
	
	this.setOrigin = function(p)
	{
		this.pivot = p;
	}

	this.getProperties = function()
	{
		return [];
	}

	this.toggleVisibility = function(v)
	{}

	this.isVisible = function()
	{
		return true;
	}

	this.toggleFrozen = function(f)
	{}

	this.isFrozen = function()
	{
		return false;
	}


	this.setSelected = function(selected)
	{}

	this.isSelected = function()
	{
		return false;
	}

	this.updateExtents(true);
}
