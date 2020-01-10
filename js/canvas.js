/**
 *
 */
$(function () {

	var x, y, endX, endY;

	//undo redo
	var history;  //history和cStep相一致
	var cStep;
	var text_width;
	var text_height;
	var type;

	var textId;  //用于存储历史记录textarea的id,当前最大textId
	var pictureId;  //用于存储历史记录textarea的id,当前最大textId
	var cur_font_style;  //存储每个textarea对应的id和其字体样式
	var picList;
	var cur_text_id;  //记录当前textarea的id
	var cur_picture_id;  //记录当前picture的id
	var tempCommand;
	var comparisonTable;


	var intReg;
	var emptyReg;

	// simulate line rectangle input dialog when you interact with the UI
	var lineTip;
	var rectTip;
	// var fontTip =$("<textarea rows='3' cols='20' style='background:transparent;position:absolute;display:none;overflow:hidden' ></textarea>");



	var flag;
	var ctx;

	var command;
	var commandCallbacks;

	$('.show-canvas').on('click', function (event) {
		// $('body').append('<script type="text/javascript" src="js/canvas.js"><\/script>');
		event.preventDefault();

		html2canvas(document.body, {
			// allowTaint: true,
			// taintTest: false,
			// width:1566,
			// height:900,
			imageTimeout: 0
		}).then(function (canvas) {
			$('#container').append(canvas);
			$(canvas).attr('id', 'myCanvas')
			// $(canvas).attr('id','myCanvas').css({'width':'100%', 'height':'100%'});
			$('#myCanvas').addClass('container_pencil');
			showCanvas();

			$("#dialog_h").show();
			// $("#dialog").dialog("open");
		});


	});

	$('.close').on('click', function () {
		if ($('#temp').css('display') === 'block') {
			$('#temp').trigger('click');
		}
		for (var t_id in cur_font_style) {
			$('#text' + t_id).remove();
		}

		$('#myCanvas').remove();
		$('#dialog_h').hide()
	})

	function showCanvas() {

		//undo redo
		 history = [];  //history和cStep相一致
		 cStep = -1;
		 text_width = 20;
		 text_height = 30;

		 textId = 0;  //用于存储历史记录textarea的id,当前最大textId
		 pictureId = 0;  //用于存储历史记录textarea的id,当前最大textId
		 cur_font_style = [];  //存储每个textarea对应的id和其字体样式
		 picList = [];
		 comparisonTable = {
			'tools_pencil': 1,
			'tools_eraser': 2,
			'tools_trash': 3,
			'tools_line': 4,
			'tools_rectangle': 5,
			'tools_circle': 6,
			'lose_focus': 7
		};


		 intReg = /^[0-9]+\.?[0-9]*$/;
		 emptyReg = /^\s*$/;

		// simulate line rectangle input dialog when you interact with the UI
		 lineTip = $("#container").appendLine({
			width: "1px",
			type: "solid",
			color: "red",
			beginX: 0,
			beginY: 0,
			endX: 1,
			endY: 1
		});
		 rectTip = $(" <div style='border:1px solid gray;width:1px;height:1px;position:absolute;display:none;'></div>");
		// var fontTip =$("<textarea rows='3' cols='20' style='background:transparent;position:absolute;display:none;overflow:hidden' ></textarea>");
		$("#container").append(rectTip);


		flag = false;
		ctx = document.getElementById("myCanvas").getContext("2d");

		command = 1;
		commandCallbacks = $.Callbacks();


		initUI();

		commandCallbacks.add(switchCanvasContext);  //增加回调函数，后面每次使用fire都会使用一次add进去的回调函数
		commandCallbacks.add(switchCursorStyle);

		// By default,  默认选中pencil
		$("#tools_pencil").trigger("click");

		$('#tools_picture').change(preview);
		commandCallbacks.fire(command);

		// command emitter
		$("[name='toolsOption']").change(function () {
			var val = $(this).val();
			type = $(this).attr("id");

			var toolList = ['tools_pencil', 'tools_eraser', 'tools_trash', 'tools_line', 'tools_rectangle', 'tools_picture'];
			if (toolList.indexOf(type) > -1 && $('#temp').css('display') === 'block') {
				$('#temp').trigger('click');
			}

			if (val === "on" || type === "tools_picture") {
				switch (type) {
					case "tools_pencil"        : {
						command = 1;
						break;
					}
					case "tools_eraser"        : {
						command = 2;
						break;
					}
					case "tools_trash"        : {
						command = 3;
						break;
					}
					case "tools_line"        : {
						command = 4;
						break;
					}
					case "tools_rectangle"    : {
						command = 5;
						break;
					}
					case "tools_circle"        : {
						command = 6;
						break;
					}
					case "lose_focus"        : {
						command = 7;
						break;
					}
					case "tools_picture"        : {
						command = 8;
						break;
					}
					default                    : {
						command = 1;
					}
				}
				//initialize canvas context and cursor style
				commandCallbacks.fire(command);
			}
		});

		$("#container").mousemove(mouseMoveEventHandler);
		$("#container").mousedown(mouseDownEventHandler);
		$("#container").off('mouseup').mouseup(mouseUpEventHandler);

		// 在输入文字后出现id为temp的遮盖div,点击遮盖div将取消文本框动作
		$('#temp').off('click').click(function () {
			$('#temp').css("display", 'none');
			// tempCommand = command;
			// command = 7;

			if (!cur_picture_id) {

				// 在文本双击选中后会取消单击方法
				// 如果不存在文本单击事件，则添加单击事件，因为会被双击取消
				var events = $('#text' + cur_text_id).data("events");
				if (events && !events["click"]) {
					$('#text' + cur_text_id).click(clickEvent);
				}
				$('#text' + cur_text_id + ' .cover').removeClass("container_edit");
				var span = $('#text' + cur_text_id).find('span')[0];
				var spanT = $('#text' + cur_text_id);
				var textArea = $('#text' + cur_text_id + ' textarea');

				//判断用户输入空值(只有换行和空格) 判空则自动撤回，
				if (span.textContent.match(emptyReg)) {
					removeEmptyText();
				} else {
					cur_font_style[cur_text_id]['val'] = span.textContent;

					cur_font_style[cur_text_id]['top'] = spanT.css('top');
					cur_font_style[cur_text_id]['left'] = spanT.css('left');
					cur_font_style[cur_text_id]['color'] = textArea.css('color');
					cur_font_style[cur_text_id]['fontSize'] = textArea.css('font-size');
					console.log(cur_font_style)
				}

				textLoseFocus();
			} else {
				$('#pic' + cur_picture_id).removeClass('cur_area').css({border: 'none'}).draggable("option", "disabled", true);

				$('#pic' + cur_picture_id).click(picLoseFocus);
				cur_picture_id = null
			}

		});

		function picLoseFocus() {
			$(this).addClass('cur_area').css({border: '1px red dotted'});
			$(this).draggable({
				disabled: false,
				cursor: "crosshair",
				containment: "#container"
			});
			$('#temp').show();
			cur_picture_id = $(this).attr('id').substring(3);

		}

		/**
		 * In different function circumstances, the Mouse Move Event should be handled in different behalf.
		 * 鼠标移动时触发此方法
		 */
		function mouseMoveEventHandler(e) {
			switch (command) {
				case 1    : {
					drawPencil(e);
					break;
				}
				case 2    : {
					drawPencil(e);
					break;
				}
				case 3    : {
					break;
				}
				case 4    : {
					fakeLineInput(e);
					break;
				}
				case 5    : {
					fakeRectangleInput(e);
					break;
				}
				case 6    : {
					break;
				}
				case 7    : {
					break;
				}
				case 8    : {
					break;
				}
			}
		}


		function fakeRectangleInput(e) {
			var offset = $("#myCanvas").offset();
			endX = e.pageX - offset.left;
			endY = e.pageY - offset.top;
			var borderWidth = $("#penWidth").val();
			if (flag) {
				rectTip.css({left: x, top: y});
				rectTip.width(endX - x - borderWidth * 2);
				rectTip.height(endY - y - borderWidth * 2);
			}
		}


		/**
		 * 画线
		 */
		function fakeLineInput(e) {
			var offset = $("#myCanvas").offset();
			endX = e.pageX - offset.left;
			endY = e.pageY - offset.top;
			if (flag) {
				lineTip.adjustLine({
					beginX: x,
					beginY: y,
					endX: endX,
					endY: endY,
					parent: $("#myCanvas")
				})
			}
		}


		//draw free line
		function drawPencil(e) {
			//if the mouse button is pressed down,draw the mouse moving trace.
			if (flag) {
				var offset = $("#myCanvas").offset();
				var x = e.pageX - offset.left;
				var y = e.pageY - offset.top;
				$("#show").html(x + ", " + y + "  " + e.which);
				ctx.lineTo(x, y);
				ctx.stroke();
			} else {
				// set the begin path for brash
				ctx.beginPath();
				var offset = $("#myCanvas").offset();
				var x = e.pageX - offset.left;
				var y = e.pageY - offset.top;
				ctx.moveTo(x, y);
			}
		}


		/**
		 * clear canvas
		 */
		function clearCanvas() {
			ctx.fillStyle = "#FFFFFF";
			var width = $("#myCanvas").attr("width");
			var height = $("#myCanvas").attr("height");
			ctx.fillRect(0, 0, width, height);
		}

		// 鼠标点击开始移动时触发
		function mouseDownEventHandler(e) {

			// set mousedown flag for mousemove event
			flag = true;
			//set the begin path of the brash
			var offset = $("#myCanvas").offset();
			x = e.pageX - offset.left;
			y = e.pageY - offset.top;

			switch (command) {
				case 1    : {
					break;
				}
				case 2    : {
					break;
				}
				case 4    : {
					lineTip.show();
					break;
				}
				case 5    : {
					var borderColor = "#" + $("#colorpicker-popup").val();
					var borderWidth = $("#penWidth").val() + "px";
					var sr = borderColor + " " + borderWidth + " solid";
					var backgroundColor = "#" + $("#colorpicker-popup2").val();
					rectTip.css({
						"border": sr,
						"background-color": backgroundColor
					});
					rectTip.show();
					break;
				}
				case 6    : {
					addTextArea();
					historyPush(6);
					break;
				}
				case 7    : {
					break;
				}
				case 8    : {
					break;
				}
			}
		}

		// 鼠标移动停止时触发
		function mouseUpEventHandler(e) {

			flag = false;

			// records operations history for undo or redo
			if (command != 7) {
				historyPush(command);
			}

			switch (command) {
				case 1    : {
					break;
				}
				case 2    : {
					break;
				}
				case 4    : {
					drawline();
					break;
				}
				case 5    : {
					drawRectangle();
					break;
				}
				case 6    : {
					break;
				}
				case 7    : {
					break;
				}
				case 8    : {
					break;
				}
			}
		}


		$("#tools_undo").click(undo);
		$("#tools_redo").click(redo);


		function addTextArea() {

			var new_fontTip;
			var isExist = false;

			textId++;
			cur_text_id = textId;
			//判断是否存在 #text系列的id（回撤过的）
			if ($("#text" + textId)[0]) {
				new_fontTip = $("#text" + textId);
				new_fontTip.find("textarea").val("").removeAttr('readonly').removeAttr('disabled');
				new_fontTip.find('.cover').removeClass("container_edit");

				new_fontTip.find("span").text("");

				new_fontTip.css({border: "1px solid gray", "display": 'block'});  //后期要改 字体样式
				isExist = true;
				new_fontTip.find("textarea")[0].focus();

			} else {
				new_fontTip = $("<div class='expandingArea' style='min-width: 60px;width: auto;display:block;background: none;'></div>").attr("id", "text" + textId);
				new_fontTip.append("<pre><span></span><br></pre><textarea></textarea><div class='cover' style='opacity: 0;display: none;position: absolute;width: 100%;height: 100%;left: 0;top: 0;'></div>");
				$("#container").append(new_fontTip);
			}

			//设置及存储字体样式
			var fontSize = $('#fontSize').val();
			var color = "#" + $("#colorpicker-popup2").val();


			$("#text" + cur_text_id + " textarea").css({
				"font-size": fontSize,
				"color": color,
				'line-height': fontSize
			});

			cur_font_style[cur_text_id] = {fontSize: fontSize, color: color};

			new_fontTip.css({left: x - text_width / 2, top: y - text_height / 2});

			new_fontTip.addClass("cur_area");
			$('#temp').show();

			tempCommand = 6;
			command = 7;

			if (!isExist) {
				makeExpandingArea(new_fontTip);
			}
		}


		function makeExpandingArea(container) {

			var area = container.find('textarea')[0];
			var span = container.find('span')[0];

			area.addEventListener('input', function () {
				span.textContent = area.value;

			}, false);
			span.textContent = area.value;


			container.addClass("active");

			area.focus();


			// 输入框大小（span标签）自适应
			container.bind('DOMNodeInserted', function () {
				var lst = [];
				var textList = span.textContent.split(/[\n,]/g);
				for (var z in textList) {
					lst.push(getLength(textList[z]));
				}
				var max_len = Math.max.apply(null, lst);

				var curFontWidth = cur_font_style[cur_text_id]["fontSize"];

				container.width((max_len * parseInt(curFontWidth.slice(0, -2)) * 0.591 + text_width / 3) + 'px');  //0.591是测试后适应最好的

				container.height(((parseInt(curFontWidth.slice(0, -2))) * (parseInt(z) + 1) + text_height) + 'px');

			});
		}

		// 以下情况时 要自动除去空文本框
		// 在点击id为temp的div时
		//
		function removeEmptyText() {
			history.splice(cStep, cStep);
			cStep--;


			cur_font_style.splice(cur_text_id, cur_text_id);
			$("#text" + cur_text_id).remove();
			cur_text_id = null;
			textId--;

		}


		// 获取真实字符串长度
		function getLength(str) {
			return str.replace(/[\u0391-\uFFE5]/g, "aa").length;   //先把中文替换成两个字节的英文，在计算长度
		}

		/**
		 * function: draw straight line
		 */
		function drawline() {
			ctx.beginPath();
			var offset = $("#myCanvas").offset();
			ctx.moveTo(x, y);
			ctx.lineTo(endX, endY);
			ctx.stroke();
			lineTip.hide();
		}


		/**
		 * function : draw  rectangle
		 */
		function drawRectangle() {
			var borderWidth = $("#penWidth").val();
			ctx.fillRect(x + borderWidth, y + borderWidth, endX - x, endY - y);
			ctx.strokeRect(x, y, endX - x, endY - y);
			$("#myCanvas").focus();
			rectTip.hide();
		}


		// textarea失去焦点
		function textLoseFocus() {

			$("#text" + cur_text_id).css({border: "none", background: "none"}).removeClass("cur_area")
				.off('mouseover').off('mouseout').mouseover(inChange).mouseout(outRecover).click(clickEvent)
				.dblclick(dblclickEvent);

			$("#text" + cur_text_id + " textarea").attr({
				readonly: "readonly",
				disabled: 'disabled'
			}).addClass('disable_text_highlighting');
			$("#text" + cur_text_id + " .cover").css({display: 'none'});

			cur_text_id = null;


			command = tempCommand;

			// 增加鼠标移到输入框和移出输入框命令切换 是为了在该输入框不可编辑时 防止其他command状态输入到该输入框范围。
			// 然而会影响输入框可编辑时的操作
			function inChange() {

				// if (!cur_text_id){
				tempCommand = command;
				command = 7;
				// }
			}

			function outRecover() {
				if (!cur_text_id) {
					command = tempCommand;
				} else {
					tempCommand = comparisonTable[type];
				}
			}

			function dblclickEvent() {
				$(this).off('click');
				$(this).find('.cover').css({display: "none"}).removeClass("container_edit");
				$(this).draggable("option", "disabled", true);
				$(this).find('textarea').removeAttr('readonly').removeAttr('disabled');

				$(this).find('textarea')[0].focus();
			}
		}

		function clickEvent() {

			// 做判断是因为有一种情况也会发生：当编辑文字后文本未失焦且用户点击了其他输入框
			if ($('#temp').css('display') !== 'block') {
				cur_text_id = $(this).attr('id').substring(4);
				$(this).find('.cover').addClass("container_edit");

				$(this).css({border: "1px solid gray"}).addClass("cur_area");
				$('#temp').show();

				$("#text" + cur_text_id + ' .cover').css({display: "block"});
				$("#text" + cur_text_id).draggable({
					disabled: false,
					cursor: "crosshair",
					containment: "#container"
				});
			}


		}

		/**
		 * 回撤
		 * 这里有四种情况
		 * 1.画撤回后还是画；
		 * 2.画撤回后是字，还需要判断后面是否还有字，直到是画为止；
		 * 3.字撤回后是字；
		 * 4.字撤回后是画
		 *
		 * 外加情况：存在temp的时候
		 * function: undo
		 */
		function undo() {
			if ($('#temp').css("display") === 'block') {
				$('#temp').css("display", 'none');
				command = tempCommand;
			}

			if (cStep > 0) {
				cStep--;
				// history[cStep+1].length>1000 为true时，说明是要撤回的是画
				if (history[cStep + 1].length > 1000) {

					if (history[cStep].startsWith('text')) {
						// 第2种情况
						var ctemp = cStep;
						while (history[ctemp].length < 1000) {
							ctemp--;
						}
						clearCanvas();
						var tempImage = new Image();
						tempImage.src = history[ctemp];
						tempImage.onload = function () {
							ctx.drawImage(tempImage, 0, 0);
						};
					} else {
						clearCanvas();
						var tempImage = new Image();
						tempImage.src = history[cStep];
						tempImage.onload = function () {
							ctx.drawImage(tempImage, 0, 0);
						};  //onload表示立即执行此匿名方法

					}

				}
				// 这里是3和4两种情况
				else {
					$('#' + history[cStep + 1]).css("display", "none");
					textId--;
				}

			}

		}


		/**
		 * 恢复
		 * function:  redo
		 */
		function redo() {
			if (cStep < history.length - 1) {
				cStep++;
				if (history[cStep].length > 1000) {
					clearCanvas();
					var tempImage = new Image();
					tempImage.src = history[cStep];
					tempImage.onload = function () {
						ctx.drawImage(tempImage, 0, 0);
					};  // 画图  123456
				} else {
					textId++;
					$('#text' + textId).css("display", "block");

				}

			}
		}


		//// define function
		function initUI() {

			history.push($("#myCanvas").get(0).toDataURL());
			cStep++;  // 初始化在cStep为0时history索引为0处是空白画板



			//3. 工具条
			$("#tools_pencil").button({
				icons: {
					primary: "ui-icon-pencil"
				}
			});

			$("#tools_eraser").button({
				icons: {
					primary: "ui-icon-bullet"
				}
			});
			$("#tools_trash").button({
				icons: {
					primary: "ui-icon-trash"
				}
			});

			$("#tools_save").button({
				icons: {
					primary: "ui-icon-disk"
				}
			});


			$("#tools_undo").button({
				icons: {
					primary: "ui-icon-arrowreturnthick-1-w"
				}
			});

			$("#tools_redo").button({
				icons: {
					primary: "ui-icon-arrowreturnthick-1-e"
				}
			});
			$("#tools_line").button({
				icons: {
					primary: "ui-icon-minusthick"
				}
			});
			$("#tools_rectangle").button({
				icons: {
					primary: "ui-icon-stop"
				}
			});
			$("#tools_circle").button({
				icons: {
					primary: "ui-icon-radio-off"
				}
			});
			// $("#tools_picture").button({
			//    icons:{
			// 	   primary:"ui-icon-image"
			//    }
			// });

			$("#boldOption").button();
			$("#italicOption").button();

			//4. 画笔粗细设置
			$("#penWidth").selectmenu({
				width: 70,
				select: penWidthEventListener
			});

			function penWidthEventListener(event, ui) {

				//1. update brash width
				var lineWidth = ui.item.value;
				ctx.lineWidth = lineWidth;

				//2. update LineTip Width
				lineTip.css("border-top-width", lineWidth + "px");

				//3.update RectTip width
				rectTip.css("border-width", lineWidth + "px");
				return false;
			}


			$("#fontSize").selectmenu({
				width: 100,
				select: function (event, ui) {
					setFont();
				}
			});


			$("#fontType").selectmenu({
				width: 100,
				select: function (event, ui) {
					setFont();
					return false;
				}
			});

			setFont();

			//5. 颜色选择器
			$("#colorpicker-popup").colorpicker({
				buttonColorize: true,
				alpha: true,
				draggable: true,
				showOn: 'both',
				close: borderColorEventListener
			});

			function borderColorEventListener(e) {
				// 1. set brash context
				var color = "#" + $(this).val();
				ctx.strokeStyle = color;

				// 2. set tips info
				lineTip.css({"border-color": color});
				rectTip.css({"border-color": color});
				//fontTip.css({"border-color":color});
			}


			//5. Fill Color Picker
			$("#colorpicker-popup2").colorpicker({
				buttonColorize: true,
				alpha: true,
				draggable: true,
				showOn: 'both',
				close: fillColorEventListener
			});

			function fillColorEventListener(e) {
				var color = "#" + $(this).val();
				ctx.fillStyle = color;
				rectTip.css({"background-color": color});
				$("#text" + cur_text_id + " textarea").css({"color": color});
			}

		}

		$("#italicOption").click(setFont);
		$("#boldOption").click(setFont);

		// 设置字体
		function setFont() {
			var size = $("#fontSize").val();
			var type = $("#fontType").val();
			var color = "#" + $("#colorpicker-popup2").val();

			var fontWeight = $("#boldOption").get(0).checked;
			fontWeight = fontWeight ? "bold" : " ";

			var fontItalic = $("#italicOption").get(0).checked;
			fontItalic = fontItalic ? " italic " : " ";
			ctx.font = fontItalic + fontWeight + " " + size + " " + type;
			if (cur_text_id) {
				cur_font_style[cur_text_id]["fontSize"] = size;
				cur_font_style[cur_text_id]["color"] = color;

				var span = $('#text' + cur_text_id + ' span')[0];
				var container = $('#text' + cur_text_id);
				autoFontSize(span, container)
			}
			$("#text" + cur_text_id + " textarea").css({
				"font-size": size,
				"line-height": size,
				"font-family": type,
				color: color,
				"font-style": fontItalic,
				"font-weight": fontWeight
			});
		}

		$("#tools_save").off('click').on('click',saveItAsImage);

		/**
		 * save canvas content as image
		 */
		function saveItAsImage() {
			var padLen = 5;

			for (var t_id in cur_font_style) {
				ctx.font = (parseInt(getStr(cur_font_style[t_id]['fontSize'],2))-1) + 'px ' + '微软雅黑';

				ctx.strokeStyle = cur_font_style[t_id]['color'];
				ctx.fillStyle = cur_font_style[t_id]['color'];

				ctx.fillText(cur_font_style[t_id]['val'], parseInt(getStr(cur_font_style[t_id]['left'],2))+padLen+1, parseInt(getStr(cur_font_style[t_id]['top'],2))+parseInt(getStr(cur_font_style[t_id]['fontSize'],2))+padLen+4-1);
				$('#text' + t_id).remove();
			}

			var image = $("#myCanvas").get(0).toDataURL("image/png").replace("image/png", "image/octet-stream");

			//locally save
			window.location.href = image;
		}




		function getStr(str, num) {

			return str.substring(0,str.length-num);
		}
		/**
		 * put current canvas to cache
		 */
		function historyPush(command) {
			cStep++;

			if (cStep < history.length) {
				history.length = cStep;
			}

			if (command == 6) {

				history.push('text' + textId);

			} else if (command == 8) {
				history.push('pic' + cur_picture_id);
			} else {
				var expandList = $("#container .expandingArea");
				if (expandList[0]) {
					var e_lst = [];
					// 对所有已展示的输入框进行隐藏
					for (var ex in expandList) {
						if (intReg.test(ex) && expandList[ex].style.display !== "none") {
							expandList[ex].style.display = "none";

							e_lst.push(ex);
						}
					}

					history.push($("#myCanvas").get(0).toDataURL());
					for (var el in e_lst) {
						expandList[e_lst[el]].style.display = "block";
					}
				} else {
					history.push($("#myCanvas").get(0).toDataURL());
				}

			}

		}


		/**
		 * switch the canvas context for different command
		 */
		function switchCanvasContext(command) {
			ctx.lineWidth = $("#penWidth").val();
			ctx.strokeStyle = "#" + $("#colorpicker-popup").val();
			ctx.lineCap = "round";
			ctx.fillStyle = "#" + $("#colorpicker-popup2").val();

			if (command) {
				switch (command) {
					case 1: {
						break;
					}
					case 2: {
						ctx.strokeStyle = "#FFFFFF";
						break;
					}
					case 3: {
						clearCanvas();
						$("#tools_pencil").trigger("click");
						$("#tools_pencil").focus();
					}
				}
			}
			return ctx;
		}


		/**
		 *  switch cursor style for different command
		 */
		function switchCursorStyle(command) {
			switch (command) {
				case 1: {
					$("#myCanvas").removeClass("container_eraser").removeClass("container_font").addClass("container_pencil");
					break;
				}
				case 2: {
					$("#myCanvas").removeClass("container_pencil").removeClass("container_font").addClass("container_eraser");
					break;
				}
				case 6: {
					$("#myCanvas").removeClass("container_eraser").removeClass("container_pencil").addClass("container_font");
					break;
				}
				default: {
					$("#myCanvas").removeClass("container_eraser").removeClass("container_font").addClass("container_pencil");
					break;
				}
			}

		}

		function autoFontSize(span, container) {
			var lst = [];
			var textList = span.textContent.split(/[\n,]/g);
			for (var z in textList) {
				lst.push(getLength(textList[z]));
			}
			var max_len = Math.max.apply(null, lst);

			var curFontWidth = cur_font_style[cur_text_id]["fontSize"];

			container.width((max_len * parseInt(curFontWidth.slice(0, -2)) * 0.591 + text_width / 3) + 'px');  //0.591是测试后适应最好的

			container.height(((parseInt(curFontWidth.slice(0, -2))) * (parseInt(z) + 1) + text_height) + 'px');
		}


		function preview() {
			//参考https://blog.csdn.net/weixin_41850404/article/details/91989264

			var inputFile = $(this)[0].files[0];

			if (inputFile.size > 3 * 1024 * 1024) {
				alert("上传图片不能大于3M！");
				return;
			}

			var reader = new FileReader();
			reader.readAsDataURL(inputFile);
			reader.onload = function (e) {

				var data = e.target.result;
				//加载图片获取图片真实宽度和高度
				var image = new Image();
				image.src = data;

				// 图片先加载完，才可以得到图片宽度和高度
				image.onload = function (evt) {

					var width = image.width;
					var height = image.height;
					// 可以以原图宽高放置在画板上
					pictureId++;
					cur_picture_id = pictureId;


					var newPic = $('<img src="' + data + '" width="650px" height="300px" style="position: absolute;"/>');
					newPic.attr("id", 'pic' + pictureId).css({
						border: "1px red dotted",
						left: "200px",
						top: "200px"
					}).addClass("cur_area");
					$("#container").append(newPic);
					newPic.draggable({
						disabled: false,
						cursor: "crosshair",
						containment: "#container"
					});

					picList.push(pictureId);
					$('#temp').show();
				}
			}

		}


		// let box = document.getElementById('box');
		// document.onmousedown = function (e) {
		//     let disx = e.pageX - box.offsetLeft;
		//     let disy = e.pageY - box.offsetTop;
		//     document.onmousemove = function (e) {
		//         box.style.left = e.pageX - disx + 'px';
		//         box.style.top = e.pageY - disy + 'px';
		//     }
		//     //释放鼠标按钮，将事件清空，否则始终会跟着鼠标移动
		//     document.onmouseup = function () {
		//         document.onmousemove = document.onmouseup = null;
		//     }
		// }

		// //在可编辑时，点击canvas标签以外的标签都会使temp消失，防止在textarea中点击后消失
		// $("body").bind("click", function(e){
		//    if($("#temp").css('display')==='block' && e.target !== $("#myCanvas")[0] && e.target !== $("#text"+ cur_text_id+ " textarea")[0]){
		// 	   $('#temp').trigger('click');
		//    }
		// })

		//测试
		// $('#myCanvas').mousemove(function () {
		// 	console.log('command:'+command+ ' |tempCommand:' + tempCommand)
		// });
		// $('#temp').mousemove(function () {
		// })
	}

})


