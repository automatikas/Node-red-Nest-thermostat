# NEST style thermostat Dashboard widget for Node-red

If you have made heating or cooling controls on Node-red you will need nice thermostat widget to display and control your device via Node-red dashboard.

![thermostat](https://user-images.githubusercontent.com/15208705/128023309-bf8d81c4-17be-40a7-912e-ec3fe8ce34a9.png)

Fully responsive design. Touch enabled set-point makes it even more interactive. Press and hold finger or mouse and it will activate the set-point sliding function.

Also it has several display modes like heating, cooling and away. It makes it more interactable and user intuitive. For ECO friendly folks there is possible to turn on and off that little green leaf. 

![heating](https://user-images.githubusercontent.com/15208705/128031236-9d219f97-c6fc-4cee-84bd-82f597b53c54.png)
![cooling](https://user-images.githubusercontent.com/15208705/128031234-ee0b535b-c40b-4278-8f57-6f6237847127.png)
![away](https://user-images.githubusercontent.com/15208705/128031229-7ad1a5c1-af22-4a1d-bf8d-db6913c1f004.png)

## How to install:
Open and copy all text from flow.js then go to your node-red application and press **`import`** > **`cliboard`** paste the text and you are done.

After import you should see something like this:
![noderedui](https://user-images.githubusercontent.com/15208705/128031528-b93ef1c9-ed68-49e1-b854-593c96162177.png)

## What data can I push in and out:

You can push the folowing values in json format. When target temperature is changed from UI node will push new values in the same structure in the output.

* **`ambient_temperature`** your temperature readings numeric payloads.
* **`target_temperature`** your thermostat setpoint numeric payloads.
* **`hvac_state`** string (`off`, `heating`, `cooling`) payload.
* **`has_leave`** boolean (`true`, `false`) payloads.
* **`away`** boolean (`true`, `false`) payloads.

```
msg.payload = {
    "ambient_temperature": 21.1,
    "target_temperature": 23,
    "hvac_state": "heating",
    "has_leaf": false,
    "away": false
}

```

If you are familiar with CSS and JAVASSCRIPT there there are more stuff to customize dial colors nd ranges etc.

## Some options in the script:
```
options = {
       diameter: options.diameter || 400,
       minValue: options.minValue || 10, //Minimum value for target temperature
       maxValue: options.maxValue || 30, //Maximum value for target temperature
       numTicks: options.numTicks || 200, //Number of tick lines to display around the dial
       onSetTargetTemperature: options.onSetTargetTemperature || function() {}, // Function called when new target temperature set by the dial
};

var properties = {
       tickDegrees: 300, // Degrees of the dial that should be covered in tick lines
       rangeValue: options.maxValue - options.minValue,
       radius: options.diameter/2,
       ticksOuterRadius: options.diameter / 30,
       ticksInnerRadius: options.diameter / 8,
       hvac_states: ['off', 'heating', 'cooling'],
       dragLockAxisDistance: 15,
       labels: {
              targetLabel: 'Set',
              ambientUnits: 'ºC'
       }
};
```

## Translation to other languages

Mode, target and units labels can be edited inside properties part of the code.

## What if I want several widgets on one dashboard page?

import several widgets just make sure you edit **uniq ID** in these 2 lines inside the code of UI_Template block. Top of the code.

`<div id="thermostat1"></div>`

`var thermostatId = "thermostat1";`

## What if I want farenheit units?

change `minValue` and `maxValue` temperatures to Farenheit in the options part of the code. The rest should be fine.

```
options = {
       diameter: options.diameter || 400,
       minValue: options.minValue || 50, // Minimum value for target temperature Farenheit
       maxValue: options.maxValue || 86, // Maximum value for target temperature Farenheit
       numTicks: options.numTicks || 200, // Number of tick lines to display around the dial
       onSetTargetTemperature: options.onSetTargetTemperature || function() {}, // Function called when new target temperature set by the dial
};
```

## What if I want to round temperatures to .1 steps?

Search the code and find `roundHalf` function:
```
function roundHalf(num) {	
       return Math.round(num*2)/2;	
}	
```

Change to this:
```
function roundHalf(num) {	
       return Math.round(num*10)/10;	
}	
```

## Issues:

Use the GitHub issues log for raising issues or contributing suggestions and enhancements. [GITHUB](https://github.com/automatikas/Node-red-Nest-thermostat)
