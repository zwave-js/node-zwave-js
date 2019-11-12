
jQuery(function ($) {
	$('.hasTip').each(function () {
		var title = $(this).attr('title');
		if (title) {
			var parts = title.split('::', 2);
			var mtelement = document.id(this);
			mtelement.store('tip:title', parts[0]);
			mtelement.store('tip:text', parts[1]);
		}
	});
	var JTooltips = new Tips($('.hasTip').get(), { "maxTitleChars": 50, "fixed": false });
});
jQuery(function ($) {
	initChosen();
	$("body").on("subform-row-add", initChosen);

	function initChosen(event, container) {
		container = container || document;
		$(container).find("select").chosen({ "disable_search_threshold": 10, "search_contains": true, "allow_single_deselect": true, "placeholder_text_multiple": "Type or select some options", "placeholder_text_single": "Select an option", "no_results_text": "No results match" });
	}
});

jQuery(document).ready(function ($) {
	var id = [1103, 1120, 1133, 1047, 1084, 1042, 362, 385, 463, 460, 189, 188, 360, 546, 524, 67, 74, 78, 88, 71, 84, 85, 70, 92, 68, 75, 77, 285, 89, 277, 287, 289, 81, 278, 79, 76, 276, 82, 80, 528, 86, 66, 912, 263, 256, 72, 83, 951, 65, 90, 87, 64, 265, 375, 63, 267, 91, 275, 73, 355, 387, 778, 576, 1096, 274, 591, 527, 405, 639, 721, 390, 535, 724, 1017, 648, 813, 948, 838, 1141, 1110, 292, 302, 402, 235, 1037, 321, 594, 624, 933, 379, 810, 1006, 1089, 1134, 942, 949, 921, 1065, 184, 518, 240, 303, 1007, 403, 384, 743, 911, 910, 238, 239, 443, 445, 473, 374, 340, 444, 1122, 225, 223, 226, 224, 953, 828, 283, 1062, 1131, 992, 1043, 1025, 1041, 864, 931, 926, 234, 1003, 236, 1022, 902, 342, 428, 521, 582, 865, 14, 18, 317, 1051, 467, 780, 905, 16, 17, 1144, 1099, 1105, 1098, 1104, 1130, 311, 15, 427, 252, 308, 689, 330, 449, 359, 935, 501, 502, 166, 1054, 165, 163, 295, 833, 830, 835, 615, 1, 290, 2, 508, 618, 3, 341, 489, 1107, 1145, 509, 534, 453, 671, 280, 241, 243, 242, 811, 1114, 271, 564, 469, 138, 947, 744, 137, 525, 581, 139, 915, 593, 884, 797, 684, 645, 589, 608, 651, 650, 694, 1027, 936, 372, 710, 183, 481, 23, 25, 24, 353, 26, 27, 492, 28, 306, 270, 34, 22, 36, 33, 35, 903, 29, 30, 855, 1028, 37, 31, 32, 601, 731, 472, 356, 660, 580, 39, 318, 38, 484, 140, 268, 616, 1030, 848, 248, 1031, 853, 1036, 670, 750, 636, 1035, 1081, 325, 1068, 777, 730, 836, 975, 851, 867, 890, 843, 860, 852, 871, 126, 1005, 711, 117, 118, 119, 787, 133, 604, 392, 408, 127, 349, 381, 847, 125, 542, 115, 328, 436, 132, 413, 983, 131, 1127, 116, 920, 120, 114, 423, 122, 121, 123, 124, 416, 129, 878, 134, 749, 1074, 1094, 1064, 1082, 130, 464, 513, 1119, 808, 1083, 733, 510, 934, 700, 219, 220, 221, 368, 222, 1090, 822, 205, 206, 208, 215, 635, 614, 213, 209, 210, 1100, 211, 358, 354, 273, 829, 212, 498, 207, 214, 1126, 324, 414, 715, 363, 567, 900, 364, 1101, 1095, 827, 476, 587, 585, 1139, 102, 264, 100, 1102, 1073, 725, 663, 570, 487, 674, 675, 676, 677, 598, 488, 697, 699, 707, 682, 790, 551, 709, 736, 530, 549, 771, 738, 1023, 545, 841, 1111, 1112, 732, 957, 888, 1069, 1026, 803, 802, 774, 346, 1040, 806, 351, 818, 976, 922, 901, 984, 889, 977, 861, 962, 765, 182, 941, 895, 310, 652, 20, 1013, 21, 505, 782, 313, 989, 466, 1121, 262, 459, 887, 1106, 425, 249, 294, 435, 250, 62, 61, 440, 538, 135, 695, 1118, 1113, 1146, 468, 417, 426, 656, 388, 304, 471, 506, 297, 441, 772, 874, 19, 1015, 339, 259, 319, 714, 658, 761, 504, 536, 42, 47, 45, 41, 377, 40, 1093, 1080, 932, 486, 946, 550, 606, 543, 680, 577, 1045, 595, 796, 1109, 643, 517, 655, 897, 862, 583, 740, 717, 46, 43, 44, 753, 719, 281, 48, 553, 646, 447, 654, 667, 559, 633, 668, 391, 255, 1063, 523, 664, 556, 196, 305, 322, 200, 195, 877, 373, 883, 702, 1092, 418, 197, 881, 879, 198, 192, 485, 194, 873, 191, 269, 350, 199, 701, 366, 193, 10, 565, 622, 1001, 631, 8, 928, 11, 872, 7, 704, 352, 1020, 610, 365, 9, 5, 6, 885, 12, 4, 13, 752, 846, 832, 673, 1091, 751, 503, 1000, 1029, 331, 332, 333, 1038, 727, 929, 726, 812, 434, 433, 279, 1142, 272, 690, 1066, 691, 952, 722, 244, 1056, 337, 1048, 1044, 439, 773, 336, 1057, 1078, 455, 526, 429, 1085, 56, 323, 462, 470, 547, 399, 617, 446, 59, 58, 537, 57, 817, 628, 982, 201, 1021, 1125, 805, 894, 807, 856, 831, 625, 662, 825, 745, 1123, 1140, 309, 180, 181, 179, 561, 499, 998, 579, 529, 172, 819, 173, 858, 175, 609, 177, 642, 261, 533, 178, 985, 320, 167, 600, 291, 168, 169, 170, 629, 560, 1097, 868, 407, 708, 1053, 229, 456, 367, 512, 415, 233, 532, 424, 620, 419, 230, 232, 231, 228, 892, 940, 960, 748, 588, 969, 1009, 990, 345, 500, 531, 1070, 266, 344, 96, 641, 98, 555, 742, 938, 94, 99, 97, 51, 53, 52, 586, 623, 632, 54, 55, 566, 563, 49, 693, 1050, 448, 404, 361, 692, 203, 870, 202, 876, 875, 260, 380, 685, 893, 943, 451, 1088, 814, 569, 994, 747, 251, 679, 613, 1147, 493, 401, 478, 522, 400, 839, 397, 1014, 1108, 973, 799, 666, 659, 966, 965, 967, 728, 964, 1132, 821, 431, 422, 993, 971, 882, 602, 378, 972, 925, 999, 974, 930, 1032, 767, 369, 370, 630, 705, 1060, 759, 688, 315, 1077, 1143, 1058, 1116, 824, 1067, 792, 981, 968, 1024, 1012, 793, 430, 712, 162, 599, 156, 293, 794, 781, 605, 562, 516, 155, 157, 158, 159, 474, 809, 801, 842, 160, 657, 161, 1034, 1049, 954, 312, 409, 863, 898, 1124, 997, 886, 854, 896, 412, 247, 980, 572, 845, 245, 314, 282, 438, 686, 554, 837, 909, 571, 866, 768, 683, 687, 475, 764, 626, 769, 672, 760, 227, 558, 669, 454, 552, 978, 105, 816, 420, 450, 849, 103, 371, 111, 112, 113, 109, 110, 988, 301, 411, 437, 104, 316, 442, 106, 107, 1016, 307, 914, 300, 1071, 756, 578, 919, 507, 640, 185, 383, 299, 382, 395, 834, 186, 795, 575, 465, 187, 776, 785, 766, 739, 788, 770, 757, 791, 541, 544, 763, 539, 480, 775, 918, 483, 917, 859, 398, 627, 634, 218, 216, 389, 326, 557, 217, 348, 698, 329, 590, 592, 961, 979, 1061, 50, 734, 783, 146, 145, 147, 258, 143, 343, 144, 141, 142, 148, 151, 548, 149, 844, 907, 741, 963, 800, 804, 880, 410, 735, 1079, 924, 950, 857, 619, 237, 713, 899, 661, 511, 495, 758, 913, 1137, 718, 1010, 706, 1138, 1072, 649, 789, 1011, 1019, 959, 945, 514, 584, 869, 991, 970, 568, 638, 491, 1128, 327, 820, 826, 798, 996, 1004, 432, 986, 246, 1008, 995, 298,];
	var completed = 0;
	var approved = 0;
	var cnt_errors = 0;
	var cnt_controller = 0;
	var cnt_slave = 0;
	var cnt_routingslave = 0;
	for (var x = 0; x < id.length; x++) {
		jQuery("#deviceList  > tbody:last-child").append("<tr id=\"device" + id[x] + "\"></tr>");

		jQuery.post({
			url: "https://www.cd-jackson.com/index.php?option=com_zwave_database&view=devicesummary&format=json&id=" + id[x], success: function (result) {
				var device;
				try {
					device = jQuery.parseJSON(result);
				} catch (e) {
					// error
					device = null;
				}
				if (device != null) {
					var rowClass = "";
					if (device.errors != null && device.errors.length != 0) {
						rowClass += "error";
						cnt_errors++;
					}
					else if (device.warnings != null && device.warnings.length != 0) {
						rowClass += "warning";
					}
					else if (device.state == 1) {
						rowClass += "success";
						approved++;
					}

					if (device.basic_class != null) {
						if (device.basic_class.name == "BASIC_TYPE_CONTROLLER") {
							cnt_controller++;
						}
						else if (device.basic_class.name == "BASIC_TYPE_SLAVE") {
							cnt_slave++;
						}
						else if (device.basic_class.name == "BASIC_TYPE_ROUTING_SLAVE") {
							cnt_routingslave++;
						}
					}

					var newRow = "<td>";

					if (device.state == 1) {
						newRow += "<span class=\"text-success icon-ok\">";
					}
					newRow += "</td><td>";
					if (device.errors != null && device.errors.length != 0) {
						newRow += "<span class=\"text-error icon-notification\">";
					}
					newRow += "</td><td>";
					if (device.warnings != null && device.warnings.length != 0) {
						newRow += "<span class=\"text-warning icon-warning\">";
					}
					newRow += "</td><td>";
					if (device.notices != null && device.notices.length != 0) {
						newRow += "<span class=\"text-info icon-info-circle\">";
					}
					newRow += "</td><td>";
					newRow += device.thingid;
					newRow += "</td><td style=\"white-space: nowrap;\">";
					newRow += device.manufacturer;
					newRow += "</td><td>";
					newRow += "<a href=\"https://www.cd-jackson.com/index.php/zwave/zwave-device-database/zwave-device-list/devicesummary/";
					newRow += device.id + "\" target=\"_blank\">" + device.label + "</a>";
					//				newRow += "</td><td style=\"white-space: nowrap;\">";
					//				newRow += device.description;
					newRow += "</td><td>";
					if (device.documents != null && device.documents.length != 0) {
						newRow += "<span class=\"icon-file-check\">";
					}
					newRow += "</td>";

					$("#device" + device.database_id).addClass(rowClass);
					$("#device" + device.database_id).html(newRow);
				}
				completed++;
				$("#progress").width((completed * 100 / id.length) + "%");

				if (completed == id.length) {
					$("#progressdiv").hide();
					$("#deviceList").show();
					$("#approvedcnt").text(approved + " (" + Math.round(approved * 100 / id.length) + "%)");
					$("#cnt_errors").text(cnt_errors);
					$("#cnt_controller").text(cnt_controller + " ");
					$("#cnt_slave").text(cnt_slave);
					$("#cnt_routingslave").text(cnt_routingslave);
				}
			}
		});
	}
});

if (typeof RokBoxSettings == 'undefined') RokBoxSettings = { pc: '100' };
(function ($) {
	$(window).load(function () {
		var stickyOffset = $('#g-navigation').offset().top;
		var stickyContainerHeight = $('#g-navigation').height();

		$('#g-navigation').wrap("<div class='g-fixed-container'>");
		$('.g-fixed-container').css("height", stickyContainerHeight);

		$(window).scroll(function () {
			var sticky = $('#g-navigation'),
				scroll = $(window).scrollTop();

			if (scroll >= stickyOffset && $(window).width() > 767) sticky.addClass('g-fixed-element');
			else sticky.removeClass('g-fixed-element');

			if (scroll >= 150 && $(window).width() > 767) sticky.addClass('g-fixed-second');
			else sticky.removeClass('g-fixed-second');
		});
	});
})(jQuery);

