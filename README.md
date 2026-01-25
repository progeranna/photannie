# Photannie

## Lab1

ТЗ доступно в документе:

- `docs/ТЗ.docx`

## Lab2

Прототип фронтенда находится в:

- `docs/admin.svg`
- `docs/client.svg`

## Lab3

Схема БД предоставлена в виде .png:

- `db_scheme.png`

## Lab4

Диаграммы BPMN и Sequence доступны в папках:

- `docs/diagrams/bpmn`
- `docs/diagrams/sequence`

## Lab5

Для запуска выполнить: 

 - `docker compose -f docker-compose.prod.yml up`

Команда подтянет образы из ghcr, запустит их и экосистему.
Далее можно обратиться к фронту клиента на:

- `http://localhost:80`

Фронт админа будет на (пароль: change_me_strong_password):

- `http://localhost:80/admin`

## Lab6

### CI
Непрерывная интеграция реализована через GitHub Actions и:

- собирает backend
- собирает frontend
- прогоняет Postman-тесты

### CD
Непрерывная доставка собирает frontend и backend, после чего публикует Docker-образы в `ghcr`.

## Lab8

Postman-тесты лежат в директории:

- коллекция: `test/postman/Collection.json`
- окружение: `test/postman/Photannie.local.postman_environment.json`

## Lab10
После запуска контейнеров Grafana будет доступна локально:

- `http://localhost:3000`
- логин/пароль стандартные: `admin/admin`

В Grafana в разделе **Alerting → Alerting rules** настроено два правила:
1. контроль состояния сервисов;
2. контроль наличия ошибок в логах.

Если что-то пойдет не так, контейнер webhook-receiver получит сообщение из графаны и залогирует его.
