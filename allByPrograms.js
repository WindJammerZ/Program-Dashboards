var programName = [],
    milestoneList = [],
    selectList = [];

var milestoneSelect = [],
    programSelect = [];

var today = new Date(),
    oneDay = 24*60*60*1000; // hours*minutes*seconds*milliseconds

var large_width = 450,
    large_height = 450,
    large_innerRadius = 390,
    small_width = 125,
    small_height = 125,
    small_innerRadius = 85,
    twoPi = 2 * Math.PI,
    program_total_progress = 0,
    program_total = 100;

var programDataTable;

var data_file_location ="data/Program_data.csv";

d3.csv(data_file_location , function(error, data){

  if(error) throw error;

  data.forEach(function(d){

    d.title       = d["Activity Description"];
    d.act_num     = d["Activity Number"];

    if(d["Unit"].length == 5){
      var str1 = d["Unit"].slice(0,4);
      var str2 = d["Unit"].slice(4,5);
        d.unit = str1.concat(" " + str2);
    }else{
      console.log("Unit data conditioning failure.  Expected a 5 length string.");
    }

    d.program = d["ITAAC"];

    if(d["Completed"] == "FALSE"){
      d.completed = "Not Completed";
    }else{
      d.completed = "Completed";
    }

    var deadlineDate = new Date(d["Deadline"]);

    d.diffDays = Math.round(Math.abs((deadlineDate.getTime() - today.getTime())/(oneDay)));

    if(d.completed == "Completed"){
      d.deadline_status = "completed";
    }else{
      if (d.diffDays <= 15){
        d.deadline_status = "urgent";
      }else if(d.diffDays > 15 && d.diffDays <= 90){
        d.deadline_status = "attention";
      }else if(d.diffDays > 90){
        d.deadline_status = "adequate";
      }
    }

    var programObject = {program:"", status:"", color:"red"};

    if (programName.map(function(e) { return e.program; }).indexOf(d.program) <= -1){
      programObject.program = d.program;
      programObject.status = d.deadline_status;
      initialColor(programObject);
      programName.push(programObject);
    }else{
      var index = programName.map(function(e) { return e.program; }).indexOf(d.program);
      if (programName[index].status != "urgent"){
        if((d.deadline_status == "urgent") || (d.deadline_status == "attention")){
          programName[index].status = d.deadline_status;
          initialColor(programName[index]);
        }
      }
    };

    d.milestone = +d["Milestone"];

    if (milestoneList.indexOf(d.milestone) <= -1){
      milestoneList.push(d.milestone);
    }

  });

  programName.sort(function(a,b) {return a.program == b.program ? 0 : (a.program < b.program ? -1 : 1);});

  milestoneList.sort(function(a, b){return a-b});

  //create the crossfilter
  var info = crossfilter(data);

  //create a grouping for all data in crossfilter for refreshing
  var all = info.groupAll();

  var programDimension = info.dimension(function(d){
    return d.program;
  });

  var itaacDTVal = info.dimension( function (d){
    return d.title + ' ' +
        d.site + ' ' +
        d.program + ' ' +
        d.completed + ' ' +
        d.inspection_type + ' ' +
        d.diffDays + ' ' +
        d.milestone
        ;
    });

  var overallCompletePercentGroup = all.reduce(
      function(p, v) {
          ++p.count;
          p.completes += (v.completed === 'Completed' ? 1 : 0);
          p.completePercent = p.count ? Math.round((p.completes/p.count)*100) : 0;
          return p;
      },
      function(p, v) {
          --p.count;
          p.completes -= (v.completed === 'Completed' ? 1 : 0);
          p.completePercent = p.count ? Math.round((p.completes/p.count)*100) : 0;
          return p;
      },
      function() {
          return {
              count: 0,
              completes: 0,
              completePercent: 0
          };
      }
  );

  var completePercentGroup = programDimension.group()
    .reduce(
      function(p, v) {
          ++p.count;
          p.completes += (v.completed === 'Completed' ? 1 : 0);
          p.completePercent = p.count ? Math.round((p.completes/p.count)*100) : 0;
          p.deadline_stat += (v.deadline_status === "urgent" ? 1 : 0);
          return p;
      },
      function(p, v) {
          --p.count;
          p.completes -= (v.completed === 'Completed' ? 1 : 0);
          p.completePercent = p.count ? Math.round((p.completes/p.count)*100) : 0;
          p.deadline_stat -= (v.deadline_status === "urgent" ? 1 : 0);
          return p;
      },
      function() {
          return {
              count: 0,
              completes: 0,
              completePercent: 0,
              deadline_stat: 0
          };
      }
    );

  var mainArc = d3.svg.arc()
      .innerRadius(large_innerRadius/2)
      .outerRadius(large_width/2)
      .startAngle(0);

  var main = d3.select("#main_arc_display").selectAll('svg')
  .data([{key: "overall", value: overallCompletePercentGroup.value().completePercent}])
  .enter()
  .append('svg')
  .attr('width', large_width)
  .attr('height', large_height)
  .append('g')
  .attr("transform", "translate(" + large_width/2  + "," + large_height/2  + ")");

  //creating background circle
  main.append("circle")
    .attr("fill", "#ffffff")
    .attr("stroke", "black")
    .attr("stroke-width", 1)
    .attr('r', large_width / 2);

  //creating arc path
  var main_arc = main.append("path")
      .attr("fill", "#21addd")
      .attr('class', 'arc')
      .each(function(d) { d.endAngle = 0; })
      .attr('d', mainArc);

  //transition arc path from start angle to end angle
  main_arc.transition()
    .duration(1200)
    // .delay(300)
    .ease('linear')
    .call(mainArcTween, this);

  //percentage value
  var main_text_title = main.append('text')
      .text(function(d){
          return ("Overall Programs");
      })
      .attr("class", "perc_title")
      .attr("text-anchor", "middle")
      .attr('font-size', '40px')
      .attr("y", +0);

  //percentage value
  var main_text_value = main.append('text')
      .text(function(d){
          return (d.value + "%");
      })
      .attr("class", "perc_value")
      .attr("text-anchor", "middle")
      .attr('font-size', '80px')
      .attr("y", +80);

  var smallArc = d3.svg.arc()
      .innerRadius(small_innerRadius/2)
      .outerRadius(small_width/2)
      .startAngle(0);

  var small = d3.select('#arc_display').selectAll('svg')
      .data(completePercentGroup.all())
      .enter()
      .append('svg')
      .attr('width', small_width)
      .attr('height', small_height)
      .append('g')
      .attr("transform", "translate(" + small_width/2  + "," + small_height/2  + ")");

  //creating background circle
  small.append("circle")
      .attr("fill", "#ffffff")
      .attr("stroke", "black")
      .attr("stroke-width", 1)
      .attr('r', small_width / 2)
      .on("click", function(d){

        if(selectList.indexOf(d.key) == -1){
          selectList.push(d.key);
          d3.select(this)
            .attr("class", "program_arc_selected")
            .attr("fill", "#fffdd0")

        }else{
          removeArrayElement(selectList, d.key);
          d3.select(this)
            .attr("class", null)
            .attr("fill", "#ffffff")

        }
        if(selectList.length > 0){
          programDimension.filterFunction(multivalue_filter(selectList));
        }else{
          programDimension.filterAll();
        }
        main_arc.transition()
          .duration(1200)
          .attrTween("d", mainArcUpdate((overallCompletePercentGroup.value().completePercent/100) * twoPi));
        RefreshTable();
      });

  //creating arc path
  var small_arc = small.append("path")
      .attr("fill", function(d){
        if(d.value.deadline_stat > 0){
          return "red";
        }else{
          return "#21addd";
        }
      })
      .attr('class', 'arc')
      .each(function(d) { d.endAngle = 0; })
      .attr('d', smallArc);

  //transition arc path from start angle to end angle
  small_arc.transition()
      .duration(1200)
      // .delay(300)
      .ease('linear')
      .call(arcTween, this );

  //title
  var small_text_title = small.append('text')
      .text(function(d){
          return (d.key);
      })
      .attr("class", "perc_title")
      .attr("text-anchor", "middle")
      .attr('font-size', '7px')
      .attr("y", +0);

  //value
  var small_text_value = small.append('text')
      .text(function(d){
          return (d.value.completePercent + "%");
      })
      .attr("class", "perc_value")
      .attr("text-anchor", "middle")
      .attr('font-size', '25px')
      .attr("y", +20);

  //CREATE DATATABLE
  $(document).ready(function(){

    itaacDataTable = $(".dc-datatable-program").DataTable({
      bSort:  true,
      bPaginate: true,
      dom:  'Bfrtip',
      buttons: [
        {
          extend:  'csvHtml5',
          title:  'Dashboard_programs_export'
        },
        {
          extend:  'excelHtml5',
          title:  'Dashboard_programs_export'
        }
      ],
      data:  itaacDTVal,
      columns: [
        {data:  "program"},
        {data:  "title"},
        {data:  "unit"},
        {data:  "completed"},
        {data:  "diffDays"},
        {data:  "milestone"}

      ],
      order: [[0, 'asc']],
      createdRow:
        function( row, data, dataIndex ) {

         if ( data.diffDays <= 15 ) {
           $('td', row).css('background-color', 'Red');
         }
       }
    });

    RefreshTable();
  });

  function RefreshTable()
  {
      var alldata = itaacDTVal.top(Infinity)
      itaacDataTable.clear();
      itaacDataTable.rows.add( alldata );
      itaacDataTable.draw();
  };

  function initialColor (programObj){
    if(programObj.status == "urgent"){
      programObj.color = "red";
    }else if(programObj.status == "attention"){
      programObj.color = "yellow";
    }else if(programObj.status == "adequate"){
      programObj.color = "green"
    }else{
      programObj.color = "gray";
    }
  }

  function multivalue_filter(values) {
      return function(v) {
          return values.indexOf(v) !== -1;
      };
  }

  function removeArrayElement(array_to_edit, item) {
      var index_to_remove = array_to_edit.indexOf(item);
      if(index_to_remove > -1){
        array_to_edit.splice(index_to_remove, 1);
      };
  }

  function mainArcTween(transition, newAngle) {

      transition.attrTween("d", function(d) {
          var interpolate = d3.interpolate( 0, (d.value/100) * twoPi );
          return function(t) {
              d.endAngle = interpolate(t);
              return mainArc(d);
          };
      });
  }

  function mainArcUpdate(newAngle){

    return function(d){
      var interpolate = d3.interpolate(d.endAngle, newAngle);
      return function(t){
        d.endAngle = interpolate(t);
        var text_to_return = Math.round((interpolate(t)/twoPi)*100);
        main_text_value.text(function(){return text_to_return + "%"});
        return mainArc(d);
      };
    };
  }

  function arcTween(transition, newAngle) {

    transition.attrTween("d", function(d) {
        var interpolate = d3.interpolate( 0, (d.value.completePercent/100) * twoPi );
        return function(t) {
            d.endAngle = interpolate(t);
            return smallArc(d);
        };
    });
  }

})
