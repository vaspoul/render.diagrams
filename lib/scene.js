function Scene()
{
	var objects = [];
	
	this.addObject = function (object)
	{
		objects.push(object);
	}
	
	this.draw = function(camera)
	{
		camera.clear();
		
		for (var i=0; i<objects.length; ++i)
		{
			objects[i].draw(camera);
		}
	}
	
	this.hitTest = function(a, b)
	{
		var results = [];
		
		for (var i=0; i<objects.length; ++i)
		{
			var temp = objects[i].hitTest;
			
			if (objects[i].hitTest !== undefined && objects[i].hitTest(a,b) == true)
			{
				results.push(objects[i]);
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

		for (var i=0; i<objects.length; ++i)
		{
			if (objects[i].getSnapPoints === undefined)
				continue;

			if (ignoreList.indexOf(objects[i]) >= 0)
				continue;

			var points = objects[i].getSnapPoints();

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
}
