var amqp = require('amqp');

var connection = amqp.createConnection({ host: '10.4.4.251' });

connection.on('ready', function(){

	connection.exchange('testament', { durable: true }, function(){

		connection.queue('', function(queue){

			queue.bind('testament', '*.progress');
			queue.subscribe(function(message, headers, deliveryInfo){
				console.log(deliveryInfo.routingKey, message);
			});
		});
	});
});