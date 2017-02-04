function Scene()
{
	this.objects = [];
	
	this.addObject = function (object)
	{
		this.objects.push(object);
	}
	
	this.deleteObjects = function(objectList)
	{
		for (var i=0; i<this.objects.length; ++i)
		{
			if (objectList.indexOf(this.objects[i])>=0)
			{
				this.objects.splice(i, 1);
				--i;
			}
		}
	}

	this.draw = function(camera)
	{
		camera.clear();
		
		for (var i=0; i<this.objects.length; ++i)
		{
			this.objects[i].draw(camera);
		}
	}
	
	this.hitTest = function(a, b)
	{
		var results = [];
		
		for (var i=0; i<this.objects.length; ++i)
		{
			var temp = this.objects[i].hitTest;
			
			if (this.objects[i].hitTest !== undefined && this.objects[i].hitTest(a,b) == true)
			{
				results.push(this.objects[i]);
			}
		}
		
		return results;
	}

	this.getSnapPoint = function(mousePos, threshold, ignoreList)
	{
		var bestPoint = null;
		var bestDistance = 1000;

		if (ignoreList == undefined)
			ignoreList = [];

		for (var i=0; i<this.objects.length; ++i)
		{
			if (this.objects[i].getSnapPoints === undefined)
				continue;

			if (ignoreList.indexOf(this.objects[i]) >= 0)
				continue;

			var points = this.objects[i].getSnapPoints();

			if (points.length == 0)
				continue;

			for (var p=0; p<points.length; ++p)
			{
				var d = length(sub(points[p], mousePos));

				if (d<threshold && d<bestDistance)
				{
					bestDistance = d;
					bestPoint = points[p].copy();
				}
			}
		}

		return bestPoint;
	}

	this.getDragPoint = function(mousePos, threshold, localSpace, ignoreList)
	{
		var bestPoint = null;
		var bestObject = null;
		var bestIndex = null;
		var bestDistance = 1000;

		if (ignoreList == undefined)
			ignoreList = [];

		for (var i=0; i<this.objects.length; ++i)
		{
			if (this.objects[i].getDragPoints === undefined)
				continue;

			if (ignoreList.indexOf(this.objects[i]) >= 0)
				continue;

			var points = this.objects[i].getDragPoints(localSpace);

			if (points.length == 0)
				continue;

			for (var p=0; p<points.length; ++p)
			{
				var d = length(sub(points[p], mousePos));

				if (d<threshold && d<bestDistance)
				{
					bestDistance = d;
					bestPoint = points[p].copy();
					bestObject = this.objects[i];
					bestIndex = p;
				}
			}
		}

		return {object: bestObject, index:bestIndex, point: bestPoint };
	}
}
