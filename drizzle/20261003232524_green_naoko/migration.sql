CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL UNIQUE,
	`name` text NOT NULL,
	`description` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`category_id` text,
	`original_text` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`currency` text NOT NULL,
	`occurred_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_expenses_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
	CONSTRAINT `fk_expenses_category_id_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE RESTRICT,
	CONSTRAINT "expenses_amount_minor_check" CHECK(typeof("amount_minor") = 'integer' AND "amount_minor" > 0 AND "amount_minor" <= 9007199254740991),
	CONSTRAINT "expenses_currency_check" CHECK("currency" GLOB '[A-Z][A-Z][A-Z]')
);
--> statement-breakpoint
CREATE INDEX `expenses_user_occurred_at_idx` ON `expenses` (`user_id`,`occurred_at`);
--> statement-breakpoint
-- Fixed catalog: canonical Spanish names and classification guidance.
-- Preserve IDs and codes in future migrations so expense references remain stable.
INSERT INTO `categories` (`id`, `code`, `name`, `description`) VALUES
	('07705580-32ce-4bb6-8a40-1c6417237cf1', 'food', 'Alimentación', 'Alimentos y bebidas: supermercado, restaurantes, cafeterías y delivery. Excluye artículos de limpieza e higiene personal, que pertenecen a Compras.'),
	('dcd83630-ae35-45ad-92cd-3cd9bd13a966', 'transport', 'Transporte', 'Traslados y gastos de vehículos: transporte público, taxis, viajes por aplicación, combustible, estacionamiento, peajes y mantenimiento de vehículos. Excluye viajes cuyo gasto corresponde a alojamiento o entretenimiento.'),
	('c34f1b54-c9fc-4142-a43e-bda74fa42ab4', 'housing', 'Vivienda', 'Alquiler, expensas, servicios del hogar como agua, electricidad, gas e internet, y reparaciones de la vivienda. Excluye alimentos, artículos de limpieza y compras de muebles o electrodomésticos.'),
	('e3d5eb45-9a9e-4a62-8734-0a3576a50904', 'health', 'Salud', 'Consultas médicas, estudios, tratamientos, medicamentos y cobertura de salud. Excluye productos generales de higiene personal, que pertenecen a Compras.'),
	('251c01be-71a5-47a1-9022-15964a3eb53d', 'entertainment', 'Entretenimiento', 'Actividades de ocio, cine, espectáculos, juegos, suscripciones de entretenimiento y actividades deportivas recreativas. Excluye comida y bebidas, incluso durante una salida, y traslados.'),
	('30df2a7c-7bd0-4a04-956b-2f08c6e8969e', 'shopping', 'Compras', 'Ropa, calzado, artículos personales, higiene, limpieza, muebles, electrodomésticos y otros bienes de uso personal o del hogar. Excluye alimentos, medicamentos y materiales destinados al estudio.'),
	('074a2d34-dd8c-489c-8a94-9a44cb287dbf', 'education', 'Educación', 'Cuotas educativas, cursos, clases, libros de estudio, útiles y materiales de formación. Excluye libros y suscripciones destinados principalmente al ocio.'),
	('39c0ca82-b373-44cc-996a-f711372e8343', 'other', 'Otros', 'Gastos identificados que no encajan en las demás categorías, como donaciones, comisiones bancarias o trámites personales. No representa gastos pendientes de clasificación.');