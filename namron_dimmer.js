{
	"manufacturer": "Namron",
	"manufacturerId": "0x0438",
	"label": "Z-Wave dimmer 2 400W",
	"description": "In-Wall Dimmer Module",
	"devices": [
		{
			"productType": "0x0200",
			"productId": "0xd00c"
		}
	],
	"firmwareVersion": {
		"min": "0.0",
		"max": "255.255"
	},
	"paramInformation": {
		"2": {
			"label": "Saving load state",
			"description": "Saving load state before power failure",
			"valueSize": 1,
			"minValue": 0,
			"maxValue": 2,
			"defaultValue": 2,
			"readOnly": false,
			"writeOnly": false,
			"allowManualEntry": true
			"options": [
			  {
					 "label": "Shut off load",
					 "value": 0
			  },
			  {
					 "label": "Turn on load",
					 "value": 1
			  },
			  {
					 "label": "Save load state before power failure"
					 "value": 2
			  }
		   ]	 
		},
		"3": {
			"label": "Enable/disable to send report",
			"description": " Enable/disable to send the basic report to the Lifeline when the load state changed（When value set as 1, repower on the dimmer, it will send Basic report automatically）",
			"valueSize": 1,
			"minValue": 0,
			"maxValue": 1,
			"defaultValue": 1,
			"readOnly": false,
			"writeOnly": false,
			"allowManualEntry": true
			"options": [
			  {
					 "label": "Disable to send Basic report",
					 "value": 0
			  },
			  {
					 "label": "Enable to send Basic report",
					 "value": 1
			  }
		   ]
		},
		"4": {
			"label": "Default fade time (in seconds)",
			"description": "Default fade time (unit is second, this value has the same function as Duration of Multilevel) Valid value: 0~127",
			"valueSize": 1,
			"minValue": 0,
			"maxValue": 127,
			"defaultValue": 1,
			"unsigned": true,
			"readOnly": false,
			"writeOnly": false,
			"allowManualEntry": true
		},
		"5": {
			"label": "Minimum brightness value",
			"description": "Setting minimum brightness value. Valid value: 0~50, the bigger the value is, the higher the load’s minimum brightness is",
			"valueSize": 1,
			"minValue": 0,
			"maxValue": 50,
			"defaultValue": 15,
			"readOnly": false,
			"writeOnly": false,
			"allowManualEntry": true
		},
		"6": {
			"label": "Maxium brightness value",
			"description": "Setting maximum brightness value. Valid values: 0 ~ 100",
			"valueSize": 1,
			"minValue": 0,
			"maxValue": 100,
			"defaultValue": 100,
			"readOnly": false,
			"writeOnly": false,
			"allowManualEntry": true
		},
		"7": {
			"label": "MOSFET",
			"description": "Choose MOSFET driving type",
			"valueSize": 1,
			"minValue": 0,
			"maxValue": 1,
			"defaultValue": 0,
			"readOnly": false,
			"writeOnly": false,
			"allowManualEntry": true
			"options": [
			  {
					 "label": "Trailing edge",
					 "value": 0
			  },
			  {
					 "label": "Leading edge",
					 "value": 1
			  }
		   ]
		},
		"8": {
			"label": "External switch type",
			"description": "External switch type",
			"valueSize": 1,
			"minValue": 0,
			"maxValue": 2,
			"defaultValue": 0,
			"readOnly": false,
			"writeOnly": false,
			"allowManualEntry": true
			"options": [
			  {
					 "label": "Push button switch",
					 "value": 0
			  },
			  {
					 "label": "Normal on / off switch",
					 "value": 1
			  },
			  {
					 "label": "3-way switch"
					 "value": 2
			  }
		   ]	
		},
		"9": {
			"label": "Added / removed from a network through external switch",
			"description": "Added / removed from a network through external switch (when enables this function, triple press the external switch within 1.5 seconds to be added to or removed from a network)",
			"valueSize": 1,
			"minValue": 0,
			"maxValue": 1,
			"defaultValue": 0,
			"readOnly": false,
			"writeOnly": false,
			"allowManualEntry": true
			"options": [
			  {
					 "label": "Disable",
					 "value": 0
			  },
			  {
					 "label": "Enable",
					 "value": 1
			  }
		   ]
		},
		"11": {
			"label": "Wiring type (read only)",
			"description": "Wiring type (read only)",
			"valueSize": 1,
			"minValue": 0,
			"maxValue": 2,
			"defaultValue": 0,
			"readOnly": true,
			"writeOnly": false,
			"allowManualEntry": false
			"options": [
			  {
					 "label": "Unknown",
					 "value": 0
			  },
			  {
					 "label": "2 wire with no neutral",
					 "value": 1
			  },
			  {
					 "label": "3 wire with neutral"
					 "value": 2
			  }
		   ]	
		},
		"12": {
			"label": "Load type (read only)",
			"description": "Load type (read only)",
			"valueSize": 1,
			"minValue": 0,
			"maxValue": 3,
			"defaultValue": 0,
			"readOnly": true,
			"writeOnly": false,
			"allowManualEntry": false
			"options": [
			  {
					 "label": "Unknown",
					 "value": 0
			  },
			  {
					 "label": "Resistive",
					 "value": 1
			  },
			  {
					 "label": "Inductive"
					 "value": 2
			  },
			  {
					 "label": "Capacitive"
					 "value": 3
			  }
		   ]	
		},
		"13": {
			"label": "Enable / Disable over current protection",
			"description": "Enable / Disable over current protection (over 2.1A for 20 seconds continously",
			"valueSize": 1,
			"minValue": 0,
			"maxValue": 1,
			"defaultValue": 1,
			"readOnly": false,
			"writeOnly": false,
			"allowManualEntry": true
			"options": [
			  {
					 "label": "Disable",
					 "value": 0
			  },
			  {
					 "label": "Enable",
					 "value": 1
			  }
		   ]
		},
		"14": {
			"label": "Power automatic report absolute threshold (W)",
			"description": "Power automatic report absolute threshold, unit is W. When power changes above the absolute threshold, immediately report current power value",
			"valueSize": 2,
			"minValue": 0,
			"maxValue": 1,
			"defaultValue": 10,
			"readOnly": false,
			"writeOnly": false,
			"allowManualEntry": false
		},
		"15": {
			"label": "Power automatic report percentage threshold (%)",
			"description": "Power automatic report percentage threshold, unit is %. When power changes above the percentage threshold, immediately report current power value",
			"valueSize": 1,
			"minValue": 0,
			"maxValue": 1,
			"defaultValue": 20,
			"readOnly": false,
			"writeOnly": false,
			"allowManualEntry": false
		},
		"21": {
			"label": "Power metering automatic report time cycle (seconds)",
			"description": "Power metering automatic report time cycle, unit is second. Valid time cycle value: 5~2678400, when set as 0, report function disabled",
			"valueSize": 4,
			"minValue": 0,
			"maxValue": 2678400,
			"defaultValue": 600,
			"readOnly": false,
			"writeOnly": false,
			"allowManualEntry": true
		},
		"22": {
			"label": "Energy metering automatic report time cycle (seconds)",
			"description": "Energy metering automatic report time cycle, unit is second. Valid time cycle value: 5~2678400, when set as 0, report function disabled",
			"valueSize": 4,
			"minValue": 0,
			"maxValue": 2678400,
			"defaultValue": 1800,
			"readOnly": false,
			"writeOnly": false,
			"allowManualEntry": true
		},
		"23": {
			"label": "Voltage metering automatic report time cycle (seconds)",
			"description": "Voltage metering automatic report time cycle, unit is second. Valid time cycle value: 5~2678400, when set as 0, report function disabled",
			"valueSize": 4,
			"minValue": 0,
			"maxValue": 2678400,
			"defaultValue": 3600,
			"readOnly": false,
			"writeOnly": false,
			"allowManualEntry": true
		},
		"24": {
			"label": "Current metering automatic report time cycle (seconds)",
			"description": "Current metering automatic report time cycle, unit is second. Valid time cycle value: 5~2678400, when set as 0, report function disabled",
			"valueSize": 4,
			"minValue": 0,
			"maxValue": 2678400,
			"defaultValue": 3600,
			"readOnly": false,
			"writeOnly": false,
			"allowManualEntry": true
		},
		"31": {
			"label": "Set dimming curve",
			"description": "Setting dimming curve",
			"valueSize": 1,
			"minValue": 0,
			"maxValue": 1,
			"defaultValue": 0,
			"readOnly": false,
			"writeOnly": false,
			"allowManualEntry": true
			"options": [
			  {
					 "label": "Linear dimming",
					 "value": 0
			  },
			  {
					 "label": "Logarithmic dimming",
					 "value": 1
			  }
		   ]
		},
		"32": {
			"label": "Set startup brightness",
			"description": "Setting startup brightness of the load",
			"valueSize": 1,
			"minValue": 0,
			"maxValue": 99,
			"defaultValue": 0,
			"readOnly": false,
			"writeOnly": false,
			"allowManualEntry": true
		},
	}
}
