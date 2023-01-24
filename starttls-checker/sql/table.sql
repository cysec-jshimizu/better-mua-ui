CREATE TABLE domains (
    domain VARCHAR(255) PRIMARY KEY,
    mx JSON
);

CREATE TABLE starttls (
    domain VARCHAR(255) PRIMARY KEY,
    status BOOLEAN
);

CREATE TABLE mtasts (
    domain VARCHAR(255) PRIMARY KEY,
    status BOOLEAN,
    record VARCHAR(1024),
    policy VARCHAR(1024)
);

CREATE TABLE dane (
    domain VARCHAR(255) PRIMARY KEY,
    status BOOLEAN,
    record JSON
);
